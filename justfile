# ---------------------------------------------------------------------------
# GENERATED FILE — managed by flake-hub (golden-base).
# Do not edit manually: `nix run .#generate` overwrites it.
# To change it, edit repo.nix, or the template in the pack that owns it.
# ---------------------------------------------------------------------------

import? 'just/base.just'

project := "blog"

fetch:
    curl -sSfL https://raw.githubusercontent.com/Fomiller/justfiles/refs/heads/main/base.just > just/base.just

generate:
    nix run .#generate

build:
    npm run build

test:
    npm test

plan env="dev":
    cd infra/live/{{env}} && terragrunt stack run plan

apply env="dev":
    cd infra/live/{{env}} && terragrunt stack run apply
