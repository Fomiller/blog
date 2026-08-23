{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    golden-engine.url = "github:Fomiller/flake-hub?dir=golden-engine&ref=refs/tags/golden-engine-0.5.0";
    golden-base.url = "github:Fomiller/flake-hub?dir=golden-base&ref=refs/tags/golden-base-0.6.0";
    golden-github.url = "github:Fomiller/flake-hub?dir=golden-github&ref=refs/tags/golden-github-0.5.0";
    golden-service.url = "github:Fomiller/flake-hub?dir=golden-service&ref=refs/tags/golden-service-0.6.0";
    golden-infra.url = "github:Fomiller/flake-hub?dir=golden-infra&ref=refs/tags/golden-infra-0.5.1";
    golden-argocd.url = "github:Fomiller/flake-hub?dir=golden-argocd&ref=refs/tags/golden-argocd-0.11.1";
  };

  outputs = { self, nixpkgs, flake-utils, golden-engine, golden-base, golden-github, golden-service, golden-infra, golden-argocd }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        golden = golden-engine.lib.mkGolden {
          packs = [ golden-base.pack golden-github.pack golden-service.pack golden-infra.pack golden-argocd.pack ];
        } pkgs (import ./repo.nix);
      in
      {
        apps.generate = golden.generateApp;
        packages.golden-files = golden.filesDrv;
      });
}
