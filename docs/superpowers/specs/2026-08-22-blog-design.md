# Blog: a digital garden on Astro, Directus, and Kargo

A public website at `blog.fomiller.com`, served from the homelab cluster, with
content authored in the Directus instance already running at `cms.fomiller.com`.

The framing is a digital garden rather than a blog. Posts cover whatever is
interesting — travel, homeownership, cars, technology, programming, cooking —
and they are allowed to be unfinished and to say so. The theme is zen: quiet,
text-first, no chrome.

## Goal

`blog.fomiller.com` serves posts read live from Directus, and a merge to `main`
reaches production through Kargo without anyone running a command.

## Non-goals

- Comments, search, analytics, newsletter, RSS. All are additive later.
- A `dev` environment. One stage, `prod`, auto-promoted. See "Environments".
- Moving `Fomiller` to a GitHub organization. See "Application discovery".

## Repos

| Repo | Why it changes |
| --- | --- |
| `kargo-project-chart` | `digestPinnedImages` becomes the default. |
| `flake-hub` | Node is not a language `golden-service` knows. The overlay's chart version is in a generated file. |
| `homelab` | Cluster prerequisites: ECR auth, app discovery, the hostname, Kargo's git identity. |
| `blog` | New. The Astro app, its chart, its overlay, its Kargo values. |

## Rendering: server-side

Astro runs as a Node server with `@astrojs/node` in standalone mode and fetches
Directus per request. Chosen over a static build.

A static build would be faster and would survive Directus being down, but every
publish would need a rebuild fired by a Directus webhook — a second moving part,
and a lag between pressing publish and seeing the post. For a personal site whose
traffic fits in one pod, that is a bad trade.

## Talking to Directus

The blog reads Directus **in-cluster**, at
`http://directus.directus.svc.cluster.local`.

This is not an optimization. `cms.fomiller.com` is in `protected_hostnames`
(`infra/units/cloudflare/global/tunnels/_locals.tf`), so every request to the
public URL hits the Cloudflare Access login wall. Server-to-server traffic over
the cluster Service never leaves the cluster and never meets Access. Nothing
about the CMS's exposure has to change.

### Images

Directus serves uploads from `/assets/<id>` on the same protected hostname. A
reader's browser fetching an image directly would be redirected to an Access
login and get no picture.

So the blog proxies them. A route at `/assets/[id]` fetches from in-cluster
Directus and streams the bytes back, with cache headers. Readers only ever talk
to `blog.fomiller.com`; the CMS stays private.

The alternative — serving uploads straight from the
`fomiller-dev-homelab-directus-uploads` S3 bucket — means making that bucket, or
a CDN in front of it, public. That is a second public surface to reason about for
no gain.

### Authentication

A Directus static token for a read-only role. Stored in AWS Secrets Manager
alongside the existing Directus secrets, pulled into the `blog` namespace by
external-secrets through the `aws-clustersecretstore` ClusterSecretStore, and
read as `DIRECTUS_TOKEN`. Same shape as
`k8s/apps/directus/external-secrets.yaml`.

## Content model

Created in Directus, not in code.

**`posts`**

| Field | Type | Note |
| --- | --- | --- |
| `title` | string | |
| `slug` | string, unique | The URL. |
| `status` | draft / published / archived | Directus's own status field. |
| `published_at` | timestamp | Sort key. Distinct from `date_created`. |
| `excerpt` | text | Index pages and meta description. |
| `body` | markdown | |
| `cover` | file | Optional. |
| `maturity` | seedling / growing / evergreen | |
| `topics` | m2m to `topics` | |

**`topics`** — `name`, `slug`. Seeded with travel, homeownership, cars,
technology, programming, cooking. A collection rather than an enum so adding one
is a CMS action, not a deploy.

**`maturity`** is what makes this a garden and not a blog. A seedling is a note
that may be wrong. An evergreen is something worth linking to. Stating it removes
the pressure that stops posts being written at all.

**Public role.** Read-only, and scoped to `status = published`. Draft posts must
not be reachable by a token that only needs to render the public site.

## Theme

Zen, in the sense of restraint, not the sense of empty.

- Serif body text at a comfortable measure. Generous margins.
- One muted accent. No cards, no borders, no drop shadows, no share buttons.
- Light and dark from `prefers-color-scheme`. No toggle.
- Topics as small plain text. Maturity as a small mark beside the title.

Pages: index, post, topic, about.

## Delivery

```
push to main
  -> GitHub Actions publishes image + chart to ECR
  -> Kargo warehouse sees both
  -> Kargo commits the new versions into argocd/overlays/prod
  -> Argo CD syncs the overlay
```

Both workflows come from `golden-argocd` unchanged.

### Kargo promotes the chart as well as the image

One warehouse, two subscription kinds:

```yaml
services:
  - name: blog
    image:
      repoURL: 695434033664.dkr.ecr.us-east-1.amazonaws.com/blog
charts:
  - name: blog-chart
    chart:
      repoURL: oci://695434033664.dkr.ecr.us-east-1.amazonaws.com/charts/blog
```

with `updatePaths` writing the image into `values.app.yaml` and the chart version
into whichever file the `golden-argocd` change below moves it to. Both are
scaffold files the generator will not overwrite.

### Image references are tag-plus-digest

The deployed reference is `<repository>:v1.2.3@sha256:...`.

The digest is what makes a deploy reproducible; a bare tag lets the cluster drift
onto a different build. But a bare digest is unreadable — `kubectl describe` tells
you nothing about which release is running. Carrying both gives an immutable
reference that a human can still read.

`kargo-project-chart` already supports this through the stage field
`digestPinnedImages`, which renders `Tag + '@' + Digest` instead of a bare
`Digest`. This design makes it the chart's default (see the change below), so the
blog's values file does not set it.

The golden deployment template needs no change. It renders
`{{ .Values.image.repository }}:{{ .Values.image.tag }}`, and feeding
`v1.2.3@sha256:...` as the tag produces exactly the reference above.

### Environments

One stage, `prod`, auto-promoting. Deliberate, and a known trade: Kargo is doing
little beyond writing a version into a file, and a bad build reaches the live site
with no gate. Adding a `dev` stage later is an overlay plus a stage entry, not a
redesign.

## Cluster prerequisites

Four things must exist before the blog can deploy. None of them exist today.

### ECR credentials for Argo CD

`charts/argo-cd/values.yaml` has `repositories: {}` and no image pull secrets.
Argo CD cannot fetch the OCI chart from ECR, and nodes cannot pull the image.
ECR tokens expire every 12 hours, so a static secret is not an option.

external-secrets is already installed and ships an `ECRAuthorizationToken`
generator. It feeds two objects: an `argocd-repo-creds` Secret for the chart pull,
and a `dockerconfigjson` pull secret in the `blog` namespace. `refreshInterval`
stays under the 12-hour expiry.

This blocks everything else. It is the first ticket.

### Application discovery

The `services` ApplicationSet (`k8s/projects/services.yaml`) currently carries an
inline `list` generator with `elements: []`, and its own comment calls that a
placeholder. It becomes a `git` files generator globbing
`k8s/services/*/config.json` in the homelab repo — the same generator the
`homelab` ApplicationSet already uses for `k8s/apps/**/config.json`. Adding a
service is then one small file, and discovery is automatic after that.

**Rejected: the `scmProvider` generator.** It would have been the better answer —
point it at the account, filter on `pathsExist: [argocd/overlays/prod]`, and any
repo that looks like a service becomes an app with no registry file anywhere. It
does not work here. Argo CD's implementation
(`applicationset/services/scm_provider/github.go`) calls
`Repositories.ListByOrg`, with no fallback to `ListByUser` and no account-type
detection. `organization` is a required field and means it literally. `Fomiller`
is a personal account, so the call 404s and the generator finds nothing.

Making `Fomiller` a GitHub organization would unlock it, but transferring repos
rewrites clone URLs and every pinned flake input across `flake-hub`, `homelab`,
and their consumers. That is its own project, not a step in this one.

### The hostname

`blog.fomiller.com` appends to `public_hostnames` in
`infra/units/cloudflare/global/tunnels/_locals.tf`. The `*.fomiller.com` wildcard
DNS record and the tunnel's wildcard ingress already cover the subdomain, so
Traefik routing by Host header is the only other piece — the same one-file change
`k8s/apps/directus/ingressroute.yaml` documents.

This is a real public exposure. The existing entries, `authentik` and `attic`, are
both there because they cannot be behind Access, and each carries its own auth.
The blog is the first hostname that is public because being public is the point.
It serves only published content and holds no session, so there is nothing behind
it to protect. Worth stating plainly rather than letting it happen quietly.

Append, never insert. Access app chunking is positional.

### Kargo's git identity

The Kargo install spec (`docs/superpowers/specs/2026-08-15-kargo-install-design.md`)
listed git write credentials as an explicit non-goal, on the grounds that nothing
promoted yet. Something promotes now.

A GitHub App, `fomiller-kargo-bot` (app id `4686096`), with Contents read and
write on `Fomiller/blog` only. An App rather than a machine user: its tokens are
short-lived, and the permission is scoped to the repository rather than to a
person's account.

Its private key and installation id go to AWS Secrets Manager and reach the Kargo
*project* namespace — not the `kargo` control-plane namespace — as a Secret
labelled `kargo.akuity.io/cred-type: git`, carrying `githubAppID`,
`githubAppPrivateKey`, `githubAppInstallationID`, and `repoURL`.

Creating the App and generating its key are manual steps outside this repo.

## flake-hub changes

Both are gaps every future service hits, not blog-specific patches.

### `golden-service` learns Node

`golden-service/registry.nix` knows `go` and `rust`. Astro is Node. A new `node`
entry supplies the build and runtime images, an `actions/setup-node` step, and
build, test, and lint commands. The Dockerfile template gains a Node branch:
multi-stage, `npm ci` against a lockfile, and only production dependencies in the
runtime layer.

Unlike Go and Rust, a Node runtime image cannot be distroless-static — the app
ships as JavaScript and needs a Node process. That is the one place the existing
two-language shape does not carry over.

### The overlay chart version moves out of a generated file

`golden-argocd` lists `argocd/overlays/*/kustomization.yaml` under `managed`, and
that file holds the chart version:

```yaml
helmCharts:
  - name: blog-chart
    version: 0.1.0
```

Kargo has to write that version on every promotion. A managed file is regenerated
from `repo.nix` by `nix run .#generate`, which would revert it — silently, and only
on whatever run happens next. The version is a deploy-time fact, not repo
configuration, so it belongs in a file the generator does not own.

## kargo-project-chart change

`digestPinnedImages` defaults to `true`.

Tag-plus-digest is the right default for the reasons under "Image references"
above, and opting in per stage means every consumer has to know the flag exists to
get the safe behavior.

This is breaking. On the current default, a consumer maps the bare digest onto an
`image.digest` key and renders `repo@sha256:...`. After the flip, that key receives
`v1.2.3@sha256:...` and renders `repo@v1.2.3@sha256:...`, which is not a valid
reference. It ships as `feat!`.

Blast radius today is zero. No Kargo Projects exist — the install spec made them a
non-goal and `services.yaml` still has `elements: []`. This is the last cheap
moment to change it.

**Implementation note.** The obvious spelling is wrong:

```gotemplate
{{- $pinned := $.stage.digestPinnedImages | default true -}}
```

Helm's `default` fires on any falsy value, so a stage that explicitly sets
`digestPinnedImages: false` gets `true` back and cannot opt out. It has to test for
presence:

```gotemplate
{{- $pinned := true -}}
{{- if hasKey $.stage "digestPinnedImages" -}}
{{- $pinned = $.stage.digestPinnedImages -}}
{{- end -}}
```

A fixture covers a stage with an explicit `false` still rendering a bare digest.
The `baseline` and `channels` snapshots both move; `prerelease-gate` already sets
the flag and must not.

## Testing

- `kargo-project-chart`: existing snapshot suite. `just test-update` and read the
  diff — the snapshots are the real test.
- `flake-hub`: each pack's `tests/expected/` fixtures. A `node` fixture renders
  the Dockerfile and CI workflow.
- `blog`: the Directus client and the asset proxy are the only real logic; both
  get tests against a stubbed Directus. Layouts and theme are verified by looking
  at them.
- End to end: merge to `main`, watch Kargo promote, confirm the running pod's
  image reference carries both tag and digest.

## Order

1. `kargo-project-chart` default flip — blog's Kargo values depend on it.
2. `flake-hub` node and chart-version fixes — the blog scaffold pins these tags.
3. `homelab` prerequisites — ECR auth first; nothing deploys without it.
4. `blog` itself.

The Kargo bot is the one item with an outside dependency and can be created in
parallel.
