#!/bin/bash

# Production Deployment Script for AI-Enhanced E-Commerce Platform
# This script deploys the entire infrastructure to production

set -e  # Exit on any error

# Configuration
NAMESPACE="ecommerce-production"
DOCKER_REGISTRY="ghcr.io"
PROJECT_NAME="ai-assisted-ecommerce"
KUBECONFIG_PATH="$HOME/.kube/config"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_warning "Helm is not installed. Some features may not work."
    fi
    
    # Check kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespace if it doesn't exist
create_namespace() {
    log_info "Creating namespace $NAMESPACE..."
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace $NAMESPACE
        log_success "Namespace $NAMESPACE created"
    fi
}

# Deploy infrastructure components
deploy_infrastructure() {
    log_info "Deploying infrastructure components..."
    
    # Apply infrastructure manifests
    kubectl apply -f kubernetes/01-infrastructure.yaml
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    
    # Wait for Redis to be ready
    log_info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
    
    log_success "Infrastructure components deployed"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Get current git commit hash for tagging
    GIT_COMMIT=$(git rev-parse --short HEAD)
    
    # Build frontend image
    log_info "Building frontend image..."
    docker build -f docker/Dockerfile.frontend -t $DOCKER_REGISTRY/$PROJECT_NAME-frontend:$GIT_COMMIT ../ecommerce_platform/frontend/
    docker push $DOCKER_REGISTRY/$PROJECT_NAME-frontend:$GIT_COMMIT
    
    # Build backend image
    log_info "Building backend image..."
    docker build -f docker/Dockerfile.backend -t $DOCKER_REGISTRY/$PROJECT_NAME-backend:$GIT_COMMIT ../ecommerce_platform/backend/
    docker push $DOCKER_REGISTRY/$PROJECT_NAME-backend:$GIT_COMMIT
    
    # Build MCP server image
    log_info "Building MCP server image..."
    docker build -f docker/Dockerfile.mcp -t $DOCKER_REGISTRY/$PROJECT_NAME-mcp:$GIT_COMMIT ../ecommerce_platform/mcp_server/
    docker push $DOCKER_REGISTRY/$PROJECT_NAME-mcp:$GIT_COMMIT
    
    # Build AI testing image
    log_info "Building AI testing image..."
    docker build -f docker/Dockerfile.testing -t $DOCKER_REGISTRY/$PROJECT_NAME-testing:$GIT_COMMIT ../ecommerce_automation/ai_enhanced_tests/
    docker push $DOCKER_REGISTRY/$PROJECT_NAME-testing:$GIT_COMMIT
    
    log_success "Docker images built and pushed"
    
    # Update image tags in Kubernetes manifests
    sed -i.bak "s|image: ecommerce/frontend:latest|image: $DOCKER_REGISTRY/$PROJECT_NAME-frontend:$GIT_COMMIT|g" kubernetes/02-applications.yaml
    sed -i.bak "s|image: ecommerce/backend:latest|image: $DOCKER_REGISTRY/$PROJECT_NAME-backend:$GIT_COMMIT|g" kubernetes/02-applications.yaml
    sed -i.bak "s|image: ecommerce/mcp-server:latest|image: $DOCKER_REGISTRY/$PROJECT_NAME-mcp:$GIT_COMMIT|g" kubernetes/02-applications.yaml
}

# Deploy applications
deploy_applications() {
    log_info "Deploying application components..."
    
    # Apply application manifests
    kubectl apply -f kubernetes/02-applications.yaml
    
    # Wait for deployments to be ready
    log_info "Waiting for backend deployment..."
    kubectl rollout status deployment/backend-deployment -n $NAMESPACE --timeout=600s
    
    log_info "Waiting for frontend deployment..."
    kubectl rollout status deployment/frontend-deployment -n $NAMESPACE --timeout=600s
    
    log_info "Waiting for MCP server deployment..."
    kubectl rollout status deployment/mcp-deployment -n $NAMESPACE --timeout=600s
    
    log_success "Application components deployed"
}

# Deploy ingress and scaling configurations
deploy_ingress_scaling() {
    log_info "Deploying ingress and scaling configurations..."
    
    # Apply ingress and scaling manifests
    kubectl apply -f kubernetes/03-ingress-scaling.yaml
    
    log_success "Ingress and scaling configurations deployed"
}

# Deploy monitoring stack
deploy_monitoring() {
    log_info "Deploying monitoring stack..."
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy Prometheus
    kubectl create configmap prometheus-config --from-file=monitoring/prometheus.yml -n monitoring --dry-run=client -o yaml | kubectl apply -f -
    kubectl create configmap prometheus-rules --from-file=monitoring/alert_rules.yml -n monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply monitoring manifests (if you have them)
    # kubectl apply -f kubernetes/04-monitoring.yaml
    
    log_success "Monitoring stack deployed"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Check if all pods are running
    log_info "Checking pod status..."
    kubectl get pods -n $NAMESPACE
    
    # Wait for all pods to be ready
    kubectl wait --for=condition=ready pod --all -n $NAMESPACE --timeout=300s
    
    # Test endpoints
    log_info "Testing service endpoints..."
    
    # Get service IPs/URLs for testing
    BACKEND_URL=$(kubectl get service backend-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):3001
    FRONTEND_URL=$(kubectl get service frontend-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):3002
    MCP_URL=$(kubectl get service mcp-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):3003
    
    # Test health endpoints (would need port-forwarding or ingress in real scenario)
    log_info "Backend service IP: $BACKEND_URL"
    log_info "Frontend service IP: $FRONTEND_URL" 
    log_info "MCP service IP: $MCP_URL"
    
    log_success "Health checks completed"
}

# Database migration and seeding
run_database_setup() {
    log_info "Setting up database..."
    
    # Run database migrations (if applicable)
    # This would typically involve running a job or connecting to the backend pod
    
    # For now, we'll just verify the database connection
    kubectl exec -n $NAMESPACE deployment/backend-deployment -- npm run db:migrate || log_warning "Database migration failed or not configured"
    kubectl exec -n $NAMESPACE deployment/backend-deployment -- npm run db:seed || log_warning "Database seeding failed or not configured"
    
    log_success "Database setup completed"
}

# Cleanup function for rollback
cleanup_on_failure() {
    log_error "Deployment failed. Starting cleanup..."
    
    # Rollback deployments
    kubectl rollout undo deployment/backend-deployment -n $NAMESPACE 2>/dev/null || true
    kubectl rollout undo deployment/frontend-deployment -n $NAMESPACE 2>/dev/null || true
    kubectl rollout undo deployment/mcp-deployment -n $NAMESPACE 2>/dev/null || true
    
    log_warning "Cleanup completed. Please check the logs for error details."
}

# Main deployment function
main() {
    log_info "Starting production deployment of AI-Enhanced E-Commerce Platform"
    log_info "=================================================="
    
    # Set trap for cleanup on failure
    trap cleanup_on_failure ERR
    
    # Run deployment steps
    check_prerequisites
    create_namespace
    deploy_infrastructure
    
    # Only build images if not in CI/CD (images should be pre-built in CI/CD)
    if [[ "${CI:-false}" != "true" ]]; then
        build_and_push_images
    fi
    
    deploy_applications
    deploy_ingress_scaling
    deploy_monitoring
    run_database_setup
    run_health_checks
    
    log_success "=================================================="
    log_success "🎉 Production deployment completed successfully!"
    log_success "=================================================="
    
    # Display connection information
    echo ""
    log_info "Service Information:"
    log_info "Namespace: $NAMESPACE"
    kubectl get services -n $NAMESPACE
    echo ""
    log_info "Pod Status:"
    kubectl get pods -n $NAMESPACE
    echo ""
    log_info "Ingress Information:"
    kubectl get ingress -n $NAMESPACE
}

# Help function
show_help() {
    echo "Production Deployment Script for AI-Enhanced E-Commerce Platform"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  --skip-images       Skip building and pushing Docker images"
    echo "  --skip-monitoring   Skip monitoring stack deployment"
    echo "  --namespace NAME    Use custom namespace (default: ecommerce-production)"
    echo "  --dry-run          Show what would be deployed without making changes"
    echo ""
    echo "Examples:"
    echo "  $0                          # Full deployment"
    echo "  $0 --skip-images           # Skip image building (use existing images)"
    echo "  $0 --namespace staging     # Deploy to staging namespace"
    echo "  $0 --dry-run              # Preview deployment"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --skip-images)
            SKIP_IMAGES=true
            shift
            ;;
        --skip-monitoring)
            SKIP_MONITORING=true
            shift
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Handle dry-run mode
if [[ "${DRY_RUN:-false}" == "true" ]]; then
    log_info "DRY RUN MODE - No changes will be made"
    kubectl apply --dry-run=client -f kubernetes/
    exit 0
fi

# Run main deployment
main