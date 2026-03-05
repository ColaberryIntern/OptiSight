module "vpc" {
  source       = "./modules/vpc"
  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
}

module "eks" {
  source             = "./modules/eks"
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  node_instance_type = var.eks_node_instance_type
  desired_capacity   = var.eks_desired_capacity
  min_size           = var.eks_min_size
  max_size           = var.eks_max_size
}

module "rds" {
  source                = "./modules/rds"
  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.private_subnet_ids
  instance_class        = var.db_instance_class
  db_password           = var.db_password
  eks_security_group_id = module.eks.node_security_group_id
}

module "elasticache" {
  source                = "./modules/elasticache"
  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.private_subnet_ids
  node_type             = var.redis_node_type
  eks_security_group_id = module.eks.node_security_group_id
}

module "ecr" {
  source       = "./modules/ecr"
  project_name = var.project_name
  services = [
    "user-service",
    "data-ingestion-service",
    "analytics-service",
    "recommendation-service",
    "notification-service",
    "ai-engine",
    "frontend"
  ]
}
