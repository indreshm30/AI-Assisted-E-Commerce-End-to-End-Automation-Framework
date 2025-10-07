# 🚨 Production Troubleshooting Guide

**Quick Reference for Common Production Issues**

## 🔥 Emergency Response Procedures

### 🚨 Critical Service Down (P0)
```bash
# 1. Check service status
kubectl get pods -n ecommerce-production | grep -v Running

# 2. Check recent deployments
kubectl rollout history deployment/backend-deployment -n ecommerce-production

# 3. Quick rollback if needed
kubectl rollout undo deployment/backend-deployment -n ecommerce-production

# 4. Check ingress and load balancer
kubectl get ingress -n ecommerce-production
kubectl describe service frontend-service -n ecommerce-production
```

### ⚠️ High Error Rate (P1)
```bash
# Check error logs from last 10 minutes
kubectl logs --since=10m -l app=backend -n ecommerce-production | grep -i error

# Check HPA scaling status
kubectl get hpa -n ecommerce-production

# Force scale if needed
kubectl scale deployment backend-deployment --replicas=10 -n ecommerce-production
```

### 📊 Database Issues (P1)
```bash
# Check database connectivity
kubectl exec -it deployment/postgres-deployment -n ecommerce-production -- pg_isready

# Check active connections
kubectl exec -it deployment/postgres-deployment -n ecommerce-production -- \
  psql -U ecommerce_user -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
kubectl exec -it deployment/postgres-deployment -n ecommerce-production -- \
  psql -U ecommerce_user -c "SELECT query, query_start, state FROM pg_stat_activity WHERE state != 'idle';"
```

## 🔍 Diagnostic Commands

### Pod Health Check
```bash
# Get all pod status
kubectl get pods -n ecommerce-production -o wide

# Check pod resource usage
kubectl top pods -n ecommerce-production

# Describe problematic pod
kubectl describe pod <pod-name> -n ecommerce-production

# Get pod logs (last 100 lines)
kubectl logs --tail=100 <pod-name> -n ecommerce-production

# Follow logs in real-time
kubectl logs -f deployment/backend-deployment -n ecommerce-production
```

### Service Connectivity
```bash
# Test service endpoints
kubectl exec -it deployment/backend-deployment -n ecommerce-production -- curl -I frontend-service:3002

# Check service endpoints
kubectl get endpoints -n ecommerce-production

# Test external connectivity
kubectl run debug-pod --rm -i --tty --image=nicolaka/netshoot -n ecommerce-production -- /bin/bash
```

### Resource Monitoring
```bash
# Check node resources
kubectl top nodes

# Check cluster events
kubectl get events -n ecommerce-production --sort-by='.lastTimestamp'

# Check persistent volumes
kubectl get pv,pvc -n ecommerce-production
```

## 🐛 Common Issues & Quick Fixes

### Issue: ImagePullBackOff
```bash
# Check image pull secrets
kubectl get secrets -n ecommerce-production

# Verify image exists
docker manifest inspect ghcr.io/your-org/ecommerce-backend:latest

# Update deployment with correct image
kubectl set image deployment/backend-deployment backend=ghcr.io/your-org/ecommerce-backend:fixed-tag -n ecommerce-production
```

### Issue: CrashLoopBackOff
```bash
# Check pod logs for crash reason
kubectl logs <pod-name> -n ecommerce-production --previous

# Check liveness/readiness probes
kubectl describe pod <pod-name> -n ecommerce-production

# Temporarily disable probes for debugging
kubectl patch deployment backend-deployment -n ecommerce-production -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","livenessProbe":null,"readinessProbe":null}]}}}}'
```

### Issue: High Memory Usage
```bash
# Check memory usage by pod
kubectl top pods -n ecommerce-production --sort-by=memory

# Check memory limits
kubectl describe deployment backend-deployment -n ecommerce-production | grep -A 5 "Limits"

# Increase memory limits if needed
kubectl patch deployment backend-deployment -n ecommerce-production -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

### Issue: Database Connection Timeout
```bash
# Check database pod status
kubectl get pods -l app=postgres -n ecommerce-production

# Test database connection from backend
kubectl exec -it deployment/backend-deployment -n ecommerce-production -- \
  node -e "const { Pool } = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows[0]); process.exit(); });"

# Check database logs
kubectl logs -f deployment/postgres-deployment -n ecommerce-production

# Restart database if needed (CAUTION: Will cause brief downtime)
kubectl rollout restart deployment/postgres-deployment -n ecommerce-production
```

## 📊 Performance Debugging

### Slow Response Times
```bash
# Check HPA metrics
kubectl describe hpa backend-hpa -n ecommerce-production

# Monitor request metrics
kubectl exec -it deployment/backend-deployment -n ecommerce-production -- \
  curl -s http://localhost:3001/metrics | grep http_request_duration

# Check if scaling is needed
kubectl get pods -l app=backend -n ecommerce-production
```

### High CPU Usage
```bash
# Check CPU usage by pod
kubectl top pods -n ecommerce-production --sort-by=cpu

# Check CPU throttling
kubectl exec -it <pod-name> -n ecommerce-production -- cat /sys/fs/cgroup/cpu/cpu.stat

# Scale deployment if needed
kubectl scale deployment backend-deployment --replicas=8 -n ecommerce-production
```

## 🔐 Security Issues

### Suspicious Activity
```bash
# Check recent authentication attempts
kubectl logs -l app=backend -n ecommerce-production | grep -i "auth\|login\|failed"

# Check network policies
kubectl get networkpolicy -n ecommerce-production

# Review service accounts and RBAC
kubectl get serviceaccounts,rolebindings -n ecommerce-production
```

### Certificate Issues
```bash
# Check certificate status
kubectl get certificates -n ecommerce-production

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Manually renew certificate if needed
kubectl delete certificate ecommerce-tls -n ecommerce-production
kubectl apply -f kubernetes/03-ingress-scaling.yaml
```

## 🔄 Rollback Procedures

### Quick Rollback (Emergency)
```bash
# Rollback to previous version (all services)
kubectl rollout undo deployment/frontend-deployment -n ecommerce-production
kubectl rollout undo deployment/backend-deployment -n ecommerce-production
kubectl rollout undo deployment/mcp-server-deployment -n ecommerce-production

# Check rollout status
kubectl rollout status deployment/backend-deployment -n ecommerce-production
```

### Selective Rollback
```bash
# View deployment history
kubectl rollout history deployment/backend-deployment -n ecommerce-production

# Rollback to specific revision
kubectl rollout undo deployment/backend-deployment --to-revision=3 -n ecommerce-production

# Verify rollback
kubectl describe deployment backend-deployment -n ecommerce-production | grep Image
```

### Database Rollback (DANGER ZONE)
```bash
# ONLY in extreme cases - requires maintenance window
# 1. Scale down all applications
kubectl scale deployment backend-deployment --replicas=0 -n ecommerce-production

# 2. Restore from backup
kubectl exec -it deployment/postgres-deployment -n ecommerce-production -- \
  psql -U ecommerce_user -c "DROP DATABASE IF EXISTS ecommerce_production_backup;"
# ... restore commands

# 3. Scale applications back up
kubectl scale deployment backend-deployment --replicas=3 -n ecommerce-production
```

## 📞 Escalation Procedures

### P0 (Critical) - Immediate Response
1. **Page on-call engineer** via PagerDuty/Slack
2. **Create incident** in incident management system
3. **Start war room** if issue persists >15 minutes
4. **Notify stakeholders** via status page

### P1 (High) - 1 Hour Response
1. **Notify team lead** via Slack
2. **Create ticket** with detailed diagnosis
3. **Schedule fix** within 4 hours
4. **Update monitoring** if needed

### P2 (Medium) - 24 Hour Response
1. **Create ticket** for tracking
2. **Plan fix** for next deployment
3. **Update documentation** if needed

## 📋 Health Check Commands

### Full System Health Check
```bash
#!/bin/bash
echo "=== PRODUCTION HEALTH CHECK ==="
echo "Timestamp: $(date)"
echo ""

echo "1. Pod Status:"
kubectl get pods -n ecommerce-production

echo -e "\n2. Service Status:"
kubectl get svc -n ecommerce-production

echo -e "\n3. HPA Status:"
kubectl get hpa -n ecommerce-production

echo -e "\n4. Resource Usage:"
kubectl top pods -n ecommerce-production

echo -e "\n5. Recent Events:"
kubectl get events -n ecommerce-production --sort-by='.lastTimestamp' | tail -10

echo -e "\n6. Ingress Status:"
kubectl get ingress -n ecommerce-production

echo -e "\n=== END HEALTH CHECK ==="
```

### Application-Specific Health Checks
```bash
# Frontend health check
kubectl exec -it deployment/frontend-deployment -n ecommerce-production -- curl -f http://localhost:3002/api/health || echo "Frontend unhealthy"

# Backend health check
kubectl exec -it deployment/backend-deployment -n ecommerce-production -- curl -f http://localhost:3001/health || echo "Backend unhealthy"

# Database health check
kubectl exec -it deployment/postgres-deployment -n ecommerce-production -- pg_isready || echo "Database unhealthy"

# Redis health check
kubectl exec -it deployment/redis-deployment -n ecommerce-production -- redis-cli ping || echo "Redis unhealthy"
```

## 🚨 Emergency Contacts

### On-Call Rotation
- **Primary**: Engineering Lead
- **Secondary**: DevOps Engineer  
- **Escalation**: CTO/VP Engineering

### Communication Channels
- **Slack**: #production-alerts
- **PagerDuty**: Production incidents
- **Status Page**: Customer communication
- **Internal Wiki**: Detailed procedures

---

**⚡ Quick Reference Card** - Print this for your desk!

```
EMERGENCY COMMANDS:
kubectl get pods -A | grep -v Running    # Find broken pods
kubectl rollout undo deployment/X -n NS  # Quick rollback
kubectl scale deployment X --replicas=0  # Emergency stop
kubectl logs -f deployment/X -n NS       # Watch logs
kubectl describe pod X -n NS             # Pod details
```

**Remember**: When in doubt, rollback first, debug later! 🔄**