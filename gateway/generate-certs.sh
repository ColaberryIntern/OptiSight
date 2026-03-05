#!/bin/bash
# Generate self-signed SSL certificates for development
mkdir -p certs
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout certs/server.key \
  -out certs/server.crt \
  -subj "/C=US/ST=State/L=City/O=OptiSight/CN=localhost"
echo "Self-signed certificates generated in gateway/certs/"
