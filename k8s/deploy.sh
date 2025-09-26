#!/bin/bash

# Apply all Kubernetes manifests
kubectl apply -f .

# Restart client deployment
kubectl rollout restart deployment client

# Restart server deployment
kubectl rollout restart deployment server

echo "Deployment applied and pods restarted successfully!"
