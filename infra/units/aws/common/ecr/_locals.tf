locals {
  # The image, then the chart. docker-ecr.yaml pushes to the first, helm-ecr.yaml
  # to the second, and the argocd overlays read both back. Every repository here
  # gets the same settings, so adding one is a single line.
  repositories = [
    var.app_prefix,
    "${var.app_prefix}-chart",
  ]
}
