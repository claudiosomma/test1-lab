terraform {
  required_version = ">= 1.0"
}

# Using local provider - no auth required, just for testing
provider "local" {}

# Minimal resource - creates a local file
resource "local_file" "test" {
  filename = "${path.module}/test.txt"
  content  = "Hello from Terraform!"
}
