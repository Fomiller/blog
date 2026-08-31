# The two repositories predate this unit and were a for_each over a list, so
# every address changed when the unit became the pack's. Without these, the
# plan destroys and recreates the repositories holding the running image.
#
# Safe to delete once the move has been applied in every environment.

moved {
  from = aws_ecr_repository.this["blog"]
  to   = aws_ecr_repository.image
}

moved {
  from = aws_ecr_repository.this["blog-chart"]
  to   = aws_ecr_repository.chart
}

moved {
  from = aws_ecr_lifecycle_policy.this["blog"]
  to   = aws_ecr_lifecycle_policy.image
}
