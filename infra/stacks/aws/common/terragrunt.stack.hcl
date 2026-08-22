locals {
  units_path = find_in_parent_folders("units")
}

unit "ecr" {
  source                  = "${local.units_path}/aws/common/ecr"
  path                    = "ecr"
  no_dot_terragrunt_stack = true
}
