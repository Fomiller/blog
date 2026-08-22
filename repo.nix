{
  name = "blog";
  description = "A digital garden, served from the homelab and written in Directus";

  language = "node";

  github = {
    codeowners = [ "@Fomiller" ];
  };

  service = {
    container = true;
    port = 8080;
    # Astro's node adapter in standalone mode writes its entry here, nowhere
    # near the dist/index.js default.
    entrypoint = "dist/server/entry.mjs";
  };

  argocd = {
    # One stage, auto-promoted. Kargo does little in this shape and a bad
    # build reaches the live site with no gate; adding dev later is an overlay
    # plus a stage entry, not a redesign.
    environments = [ "prod" ];
    registry = "695434033664.dkr.ecr.us-east-1.amazonaws.com";
    replicas = 1;
  };
}
