# Kubernetes Foundations — Complete Beginner's Tutorial

**Goal:** Learn Kubernetes fundamentals through hands-on practice with persistent storage, perfect for SRE/DBRE roles.

**Prerequisites:** Basic Linux knowledge, Docker installed, `kubectl` CLI, and `minikube` or `kind`.

---

## Video Tutorial

Watch the complete video walkthrough of this tutorial:

<div align="center">

[![Kubernetes Foundations Tutorial](https://img.youtube.com/vi/P-MIuK1BU_s/maxresdefault.jpg)](https://www.youtube.com/watch?v=P-MIuK1BU_s)

<!-- Embedded video player (works on GitHub Pages) -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/P-MIuK1BU_s" title="Kubernetes Foundations Tutorial" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="max-width: 100%; height: auto; aspect-ratio: 16/9; margin-top: 1rem;"></iframe>

</div>

🎥 [Watch on YouTube: Kubernetes Foundations Tutorial](https://www.youtube.com/watch?v=P-MIuK1BU_s)

---

## Table of Contents

1. [Setup & Prerequisites](#setup--prerequisites)
2. [Day 1: Pods and Containers](#day-1--pods-and-containers)
3. [Day 2: Deployments and ReplicaSets](#day-2--deployments-and-replicasets)
4. [Day 3: Services & Networking](#day-3--services--networking)
5. [Day 4: Persistent Storage with MariaDB](#day-4--persistent-storage-with-mariadb)
6. [Day 5: StatefulSets vs Deployments](#day-5--statefulsets-vs-deployments)
7. [Day 6: ConfigMaps and Secrets](#day-6--configmaps-and-secrets)
8. [Day 7: Debugging & Monitoring](#day-7--debugging--monitoring)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## Setup & Prerequisites

### 1. Install Required Tools

```bash
# Install kubectl (if not already installed)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Install minikube
curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
chmod +x minikube
sudo mv minikube /usr/local/bin/

# Or install kind (alternative)
curl -Lo kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x kind
sudo mv kind /usr/local/bin/
```

### 2. Start Your Kubernetes Cluster

```bash
# Option 1: Using minikube
minikube start --memory=4096 --cpus=2
kubectl cluster-info

# Option 2: Using kind
kind create cluster --name k8s-lab
kubectl cluster-info

# Verify your cluster is running
kubectl get nodes
```

**Expected Output:**
```
NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   1m    v1.28.0
```

---

## Day 1: Pods and Containers

### What is a Pod?

A **Pod** is the smallest deployable unit in Kubernetes. It can contain one or more containers that share:
- Network (same IP address)
- Storage volumes
- Lifecycle (start/stop together)

### Hands-on Exercise

#### Step 1: Create Your First Pod

```bash
# Create a simple nginx pod
kubectl run hello-nginx --image=nginx --port=80

# Check if the pod is running
kubectl get pods
```

**Expected Output:**
```
NAME           READY   STATUS    RESTARTS   AGE
hello-nginx    1/1     Running   0          30s
```

#### Step 2: Inspect the Pod

```bash
# Get detailed information about the pod
kubectl describe pod hello-nginx

# Check the pod logs
kubectl logs hello-nginx

# Get pod information in YAML format
kubectl get pod hello-nginx -o yaml
```

#### Step 3: Interact with the Pod

```bash
# Execute commands inside the pod
kubectl exec -it hello-nginx -- /bin/bash

# Inside the pod, test nginx
curl localhost

# Exit the pod
exit
```

#### Step 4: Delete the Pod

```bash
# Delete the pod
kubectl delete pod hello-nginx

# Verify it's deleted
kubectl get pods
```

### Key Concepts Learned

- **Pods are ephemeral**: When deleted, they don't restart automatically
- **Containers share resources**: Network, storage, and lifecycle
- **kubectl commands**: `run`, `get`, `describe`, `logs`, `exec`, `delete`

---

## Day 2: Deployments and ReplicaSets

### What is a Deployment?

A **Deployment** manages **ReplicaSets**, which ensure a specified number of pod replicas are running. Deployments provide:
- Self-healing (restarts failed pods)
- Rolling updates
- Rollback capabilities
- Scaling

### Hands-on Exercise

#### Step 1: Create a Deployment

```bash
# Create a deployment with 3 replicas
kubectl create deployment web-app --image=nginx --replicas=3

# Check the deployment
kubectl get deployments
kubectl get replicasets
kubectl get pods
```

**Expected Output:**
```
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
web-app   3/3     3            3           30s

NAME                DESIRED   CURRENT   READY   AGE
web-app-7d4f8b9c6   3         3         3       30s

NAME                        READY   STATUS    RESTARTS   AGE
web-app-7d4f8b9c6-abc123    1/1     Running   0          30s
web-app-7d4f8b9c6-def456    1/1     Running   0          30s
web-app-7d4f8b9c6-ghi789    1/1     Running   0          30s
```

#### Step 2: Scale the Deployment

```bash
# Scale up to 5 replicas
kubectl scale deployment web-app --replicas=5

# Check the scaling
kubectl get pods -l app=web-app

# Scale down to 2 replicas
kubectl scale deployment web-app --replicas=2
```

#### Step 3: Rolling Update

```bash
# Update the image to a different version
kubectl set image deployment/web-app nginx=nginx:1.21

# Watch the rolling update
kubectl rollout status deployment/web-app

# Check rollout history
kubectl rollout history deployment/web-app
```

#### Step 4: Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/web-app

# Check the status
kubectl rollout status deployment/web-app
```

### Key Concepts Learned

- **Deployments manage ReplicaSets**: Which manage Pods
- **Self-healing**: Automatically restarts failed pods
- **Rolling updates**: Zero-downtime deployments
- **Scaling**: Easy horizontal scaling

---

## Day 3: Services & Networking

### What is a Service?

A **Service** provides a stable network endpoint for pods. Even when pods die and restart, the service IP remains constant.

### Service Types

- **ClusterIP**: Internal cluster access (default)
- **NodePort**: Exposes service on each node's IP
- **LoadBalancer**: Cloud provider load balancer
- **Headless**: No cluster IP (for StatefulSets)

### Hands-on Exercise

#### Step 1: Expose the Deployment

```bash
# Create a service for our web-app
kubectl expose deployment web-app --port=80 --target-port=80 --type=ClusterIP

# Check the service
kubectl get services
kubectl describe service web-app
```

**Expected Output:**
```
NAME      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
web-app   ClusterIP   10.96.123.45    <none>        80/TCP    30s
```

#### Step 2: Test Internal Access

```bash
# Get the service IP
kubectl get service web-app

# Test from within the cluster
kubectl run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- http://web-app
```

#### Step 3: Create a NodePort Service

```bash
# Delete the ClusterIP service
kubectl delete service web-app

# Create a NodePort service
kubectl expose deployment web-app --port=80 --target-port=80 --type=NodePort

# Get the NodePort
kubectl get service web-app
```

**Expected Output:**
```
NAME      TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
web-app   NodePort   10.96.123.45    <none>        80:30080/TCP   30s
```

#### Step 4: Access from Host

```bash
# Get minikube IP
minikube ip

# Access the service (replace with your minikube IP)
curl http://$(minikube ip):30080

# Or use minikube service command
minikube service web-app
```

### Key Concepts Learned

- **Services provide stable endpoints**: Pods can change, service IP stays constant
- **Load balancing**: Service distributes traffic across pod replicas
- **Service discovery**: Pods can find each other by service name

---

## Day 4: Persistent Storage with MariaDB

### What is Persistent Storage?

**PersistentVolumes (PV)** and **PersistentVolumeClaims (PVC)** provide persistent storage that survives pod restarts and deletions.

### Storage Concepts

- **PV**: Cluster-wide storage resource
- **PVC**: Request for storage by a pod
- **StorageClass**: Defines how storage is provisioned
- **Access Modes**: ReadWriteOnce (RWO), ReadWriteMany (RWX), ReadOnlyMany (ROX)

### Hands-on Exercise: MariaDB with Persistence

#### Step 1: Create PersistentVolumeClaim

Create `mariadb-pvc.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mariadb-pvc
  labels:
    app: mariadb
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
  storageClassName: standard
```

```bash
# Apply the PVC
kubectl apply -f mariadb-pvc.yaml

# Check the PVC
kubectl get pvc
kubectl describe pvc mariadb-pvc
```

**Expected Output:**
```
NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
mariadb-pvc   Bound    pvc-12345678-1234-1234-1234-123456789abc   2Gi        RWO            standard       30s
```

#### Step 2: Create MariaDB Deployment

Create `mariadb-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mariadb
  labels:
    app: mariadb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mariadb
  template:
    metadata:
      labels:
        app: mariadb
    spec:
      containers:
      - name: mariadb
        image: mariadb:10.11
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "rootpassword"
        - name: MYSQL_DATABASE
          value: "testdb"
        - name: MYSQL_USER
          value: "testuser"
        - name: MYSQL_PASSWORD
          value: "testpassword"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: mariadb-storage
          mountPath: /var/lib/mysql
        livenessProbe:
          exec:
            command:
            - mysqladmin
            - ping
            - -h
            - localhost
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - mysql
            - -h
            - localhost
            - -u
            - root
            - -prootpassword
            - -e
            - "SELECT 1"
          initialDelaySeconds: 5
          periodSeconds: 2
      volumes:
      - name: mariadb-storage
        persistentVolumeClaim:
          claimName: mariadb-pvc
```

```bash
# Apply the deployment
kubectl apply -f mariadb-deployment.yaml

# Check the deployment
kubectl get pods -l app=mariadb
kubectl get deployments
```

#### Step 3: Create MariaDB Service

Create `mariadb-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mariadb
  labels:
    app: mariadb
spec:
  type: ClusterIP
  ports:
  - port: 3306
    targetPort: 3306
    protocol: TCP
    name: mysql
  selector:
    app: mariadb
```

```bash
# Apply the service
kubectl apply -f mariadb-service.yaml

# Check the service
kubectl get services
```

#### Step 4: Test Database Persistence

```bash
# Wait for MariaDB to be ready
kubectl wait --for=condition=ready pod -l app=mariadb --timeout=60s

# Connect to MariaDB and create some data
kubectl exec -it $(kubectl get pods -l app=mariadb -o jsonpath='{.items[0].metadata.name}') -- mysql -u root -prootpassword -e "
CREATE DATABASE persistence_test;
USE persistence_test;
CREATE TABLE test_table (id INT PRIMARY KEY, message VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO test_table (id, message) VALUES (1, 'Hello Kubernetes Persistence!');
INSERT INTO test_table (id, message) VALUES (2, 'Data should survive pod restarts');
SELECT * FROM test_table;
"
```

**Expected Output:**
```
+----+----------------------------------+---------------------+
| id | message                          | created_at          |
+----+----------------------------------+---------------------+
|  1 | Hello Kubernetes Persistence!    | 2024-01-15 10:30:00 |
|  2 | Data should survive pod restarts | 2024-01-15 10:30:01 |
+----+----------------------------------+---------------------+
```

#### Step 5: Test Persistence

```bash
# Delete the pod to test persistence
kubectl delete pod $(kubectl get pods -l app=mariadb -o jsonpath='{.items[0].metadata.name}')

# Wait for new pod to be ready
kubectl wait --for=condition=ready pod -l app=mariadb --timeout=60s

# Check if data persisted
kubectl exec -it $(kubectl get pods -l app=mariadb -o jsonpath='{.items[0].metadata.name}') -- mysql -u root -prootpassword -e "
USE persistence_test;
SELECT * FROM test_table;
"
```

**Expected Output:**
```
+----+----------------------------------+---------------------+
| id | message                          | created_at          |
+----+----------------------------------+---------------------+
|  1 | Hello Kubernetes Persistence!    | 2024-01-15 10:30:00 |
|  2 | Data should survive pod restarts | 2024-01-15 10:30:01 |
+----+----------------------------------+---------------------+
```

### Key Concepts Learned

- **PersistentVolumeClaim**: Requests storage from the cluster
- **Volume Mounting**: Attach persistent storage to containers
- **Data Persistence**: Data survives pod restarts and deletions
- **Health Checks**: Liveness and readiness probes ensure database is healthy

---

## Day 5: StatefulSets vs Deployments

### When to Use StatefulSets

**StatefulSets** are ideal for stateful applications that need:
- Stable, unique network identifiers
- Stable, persistent storage
- Ordered, graceful deployment and scaling
- Ordered, automated rolling updates

### Hands-on Exercise: MariaDB StatefulSet

#### Step 1: Create MariaDB StatefulSet

Create `mariadb-statefulset.yaml`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mariadb-statefulset
  labels:
    app: mariadb-statefulset
spec:
  serviceName: mariadb-statefulset
  replicas: 1
  selector:
    matchLabels:
      app: mariadb-statefulset
  template:
    metadata:
      labels:
        app: mariadb-statefulset
    spec:
      containers:
      - name: mariadb
        image: mariadb:10.11
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "rootpassword"
        - name: MYSQL_DATABASE
          value: "testdb"
        - name: MYSQL_USER
          value: "testuser"
        - name: MYSQL_PASSWORD
          value: "testpassword"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: mariadb-data
          mountPath: /var/lib/mysql
        livenessProbe:
          exec:
            command:
            - mysqladmin
            - ping
            - -h
            - localhost
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - mysql
            - -h
            - localhost
            - -u
            - root
            - -prootpassword
            - -e
            - "SELECT 1"
          initialDelaySeconds: 5
          periodSeconds: 2
  volumeClaimTemplates:
  - metadata:
      name: mariadb-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 2Gi
```

#### Step 2: Create Headless Service

Create `mariadb-statefulset-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mariadb-statefulset
  labels:
    app: mariadb-statefulset
spec:
  clusterIP: None
  ports:
  - port: 3306
    targetPort: 3306
    protocol: TCP
    name: mysql
  selector:
    app: mariadb-statefulset
```

```bash
# Apply the StatefulSet and Service
kubectl apply -f mariadb-statefulset.yaml
kubectl apply -f mariadb-statefulset-service.yaml

# Check the StatefulSet
kubectl get statefulsets
kubectl get pods -l app=mariadb-statefulset
kubectl get pvc
```

**Expected Output:**
```
NAME                   READY   AGE
mariadb-statefulset    1/1     30s

NAME                        READY   STATUS    RESTARTS   AGE
mariadb-statefulset-0       1/1     Running   0          30s

NAME                                    STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
mariadb-data-mariadb-statefulset-0      Bound    pvc-12345678-1234-1234-1234-123456789def   2Gi        RWO            standard       30s
```

#### Step 3: Compare Deployment vs StatefulSet

```bash
# Check pod names
kubectl get pods -l app=mariadb
kubectl get pods -l app=mariadb-statefulset

# Check services
kubectl get services

# Check persistent volumes
kubectl get pv
kubectl get pvc
```

### Key Differences

| Feature | Deployment | StatefulSet |
|---------|------------|-------------|
| Pod Naming | Random (web-app-abc123) | Ordered (mariadb-statefulset-0) |
| Storage | Shared PVC | Individual PVC per pod |
| Scaling | Parallel | Ordered (0, 1, 2...) |
| Network | Service IP | Stable network identity |
| Use Case | Stateless apps | Stateful apps (databases) |

---

## Day 6: ConfigMaps and Secrets

### What are ConfigMaps and Secrets?

- **ConfigMaps**: Store non-sensitive configuration data
- **Secrets**: Store sensitive data (passwords, keys, certificates)

### Hands-on Exercise

#### Step 1: Create ConfigMap

```bash
# Create ConfigMap from literal values
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=DEBUG \
  --from-literal=DATABASE_NAME=testdb \
  --from-literal=MAX_CONNECTIONS=100

# Check the ConfigMap
kubectl get configmaps
kubectl describe configmap app-config
kubectl get configmap app-config -o yaml
```

#### Step 2: Create Secret

```bash
# Create Secret from literal values
kubectl create secret generic db-secret \
  --from-literal=username=admin \
  --from-literal=password=secretpassword123

# Check the Secret
kubectl get secrets
kubectl describe secret db-secret
kubectl get secret db-secret -o yaml
```

#### Step 3: Use ConfigMap and Secret in MariaDB

Create `mariadb-with-config.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mariadb-with-config
  labels:
    app: mariadb-with-config
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mariadb-with-config
  template:
    metadata:
      labels:
        app: mariadb-with-config
    spec:
      containers:
      - name: mariadb
        image: mariadb:10.11
        ports:
        - containerPort: 3306
        env:
        # Environment variables from ConfigMap
        - name: MYSQL_DATABASE
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_NAME
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: LOG_LEVEL
        # Environment variables from Secret
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        - name: MYSQL_USER
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: username
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: mariadb-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mariadb-storage
        persistentVolumeClaim:
          claimName: mariadb-pvc
```

```bash
# Apply the deployment
kubectl apply -f mariadb-with-config.yaml

# Check if it's using the ConfigMap and Secret
kubectl describe pod $(kubectl get pods -l app=mariadb-with-config -o jsonpath='{.items[0].metadata.name}')
```

### Key Concepts Learned

- **ConfigMaps**: Store configuration data separately from application code
- **Secrets**: Store sensitive data securely (base64 encoded)
- **Environment Variables**: Inject ConfigMap and Secret data into containers
- **Separation of Concerns**: Keep configuration external to application

---

## Day 7: Debugging & Monitoring

### Essential Debugging Commands

```bash
# Check pod status
kubectl get pods -A

# Get detailed pod information
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name>
kubectl logs <pod-name> --previous  # Previous container logs

# Execute commands in pod
kubectl exec -it <pod-name> -- /bin/bash

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp

# Check resource usage
kubectl top pods
kubectl top nodes
```

### Hands-on Exercise: Debug a Broken Application

#### Step 1: Create a Broken Deployment

```bash
# Create a deployment with wrong image
kubectl create deployment broken-app --image=nginx:invalid-tag

# Check the status
kubectl get pods -l app=broken-app
kubectl describe pod $(kubectl get pods -l app=broken-app -o jsonpath='{.items[0].metadata.name}')
```

#### Step 2: Debug the Issue

```bash
# Check events for errors
kubectl get events --sort-by=.metadata.creationTimestamp | grep broken-app

# Check pod status
kubectl get pods -l app=broken-app -o wide

# Get detailed pod information
kubectl describe pod $(kubectl get pods -l app=broken-app -o jsonpath='{.items[0].metadata.name}')
```

#### Step 3: Fix the Issue

```bash
# Update the image to a valid one
kubectl set image deployment/broken-app nginx=nginx:latest

# Check if it's fixed
kubectl get pods -l app=broken-app
kubectl rollout status deployment/broken-app
```

### Monitoring Commands

```bash
# Check resource usage
kubectl top pods
kubectl top nodes

# Check pod resource limits
kubectl describe pod <pod-name> | grep -A 5 -B 5 "Limits\|Requests"

# Check cluster information
kubectl cluster-info
kubectl get nodes -o wide

# Check all resources
kubectl get all
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Pod Stuck in Pending

```bash
# Check why pod is pending
kubectl describe pod <pod-name>

# Common causes:
# - Insufficient resources
# - No available nodes
# - PVC not bound
```

#### 2. Pod CrashLoopBackOff

```bash
# Check pod logs
kubectl logs <pod-name>
kubectl logs <pod-name> --previous

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp

# Common causes:
# - Application errors
# - Resource limits exceeded
# - Configuration issues
```

#### 3. Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints <service-name>

# Check service selector
kubectl get pods -l <selector>

# Test service connectivity
kubectl run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- http://<service-name>
```

#### 4. Storage Issues

```bash
# Check PVC status
kubectl get pvc
kubectl describe pvc <pvc-name>

# Check PV status
kubectl get pv
kubectl describe pv <pv-name>

# Check storage class
kubectl get storageclass
```

### Useful Debugging Scripts

```bash
#!/bin/bash
# Quick cluster health check

echo "=== Cluster Status ==="
kubectl get nodes
echo ""

echo "=== Pod Status ==="
kubectl get pods -A
echo ""

echo "=== Service Status ==="
kubectl get services
echo ""

echo "=== Storage Status ==="
kubectl get pv,pvc
echo ""

echo "=== Recent Events ==="
kubectl get events --sort-by=.metadata.creationTimestamp | tail -10
```

---

## Summary

### What You've Learned

1. **Pods**: Basic building blocks of Kubernetes
2. **Deployments**: Manage stateless applications
3. **Services**: Provide stable network endpoints
4. **Persistent Storage**: PVCs and PVs for data persistence
5. **StatefulSets**: Manage stateful applications
6. **ConfigMaps & Secrets**: Externalize configuration
7. **Debugging**: Troubleshoot common issues

### Key Commands Reference

```bash
# Basic operations
kubectl get <resource>
kubectl describe <resource> <name>
kubectl logs <pod-name>
kubectl exec -it <pod-name> -- <command>

# Deployments
kubectl create deployment <name> --image=<image>
kubectl scale deployment <name> --replicas=<number>
kubectl rollout status deployment <name>

# Services
kubectl expose deployment <name> --port=<port> --target-port=<port>

# Storage
kubectl get pv,pvc
kubectl describe pvc <name>

# Debugging
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl top pods
kubectl top nodes
```

### Next Steps

1. **Practice**: Try deploying different applications
2. **Explore**: Learn about Ingress, RBAC, and Operators
3. **Production**: Study monitoring, logging, and security
4. **Advanced**: Learn about Helm, Istio, and GitOps

---

## Additional Resources

- [Kubernetes Official Documentation](https://kubernetes.io/docs/)
- [Kubernetes by Example](https://kubernetesbyexample.com/)
- [Kubernetes Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Kind Documentation](https://kind.sigs.k8s.io/)
