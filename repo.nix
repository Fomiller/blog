{
  name = "blog";
  description = "A digital garden, served from the homelab and written in Directus";

  language = "node";

  github = {
    codeowners = [ "@Fomiller" ];
    # The generic publish role from aws-org. Every repo that pushes an image or
    # a chart points here; nothing per-repo is created for it.
    roleToAssume = "arn:aws:iam::695434033664:role/github-actions-ecr";
    publishImage = true;
    publishChart = true;
  };

  service = {
    container = true;
    port = 8080;
    # Astro's node adapter in standalone mode writes its entry here, nowhere
    # near the dist/index.js default.
    entrypoint = "dist/server/entry.mjs";
  };

  infra = {
    dopplerProject = "blog";
    ownerEmail = "forrestmillerj@gmail.com";
    environments = {
      # dev is the only real account. It holds the ECR registry the argocd
      # overlays already point at, so the two repositories belong here even
      # though the blog itself only runs a prod stage.
      dev = {
        enabled = true;
        account = "695434033664";
        stateBucket = "fomiller-terraform-state-dev";
      };
    };
  };

  argocd = {
    # One stage, auto-promoted. Kargo does little in this shape and a bad
    # build reaches the live site with no gate; adding dev later is an overlay
    # plus a stage entry, not a redesign.
    environments = [ "prod" ];
  };
}
