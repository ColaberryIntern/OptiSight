output "endpoint" {
  description = "Redis endpoint"
  value = var.environment == "production" ? (
    length(aws_elasticache_replication_group.production) > 0 ? aws_elasticache_replication_group.production[0].primary_endpoint_address : ""
  ) : (
    length(aws_elasticache_cluster.staging) > 0 ? aws_elasticache_cluster.staging[0].cache_nodes[0].address : ""
  )
}

output "port" {
  description = "Redis port"
  value       = 6379
}

output "security_group_id" {
  description = "Security group ID for Redis"
  value       = aws_security_group.redis.id
}
