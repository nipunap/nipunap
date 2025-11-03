# Kubernetes Workloads & Scheduling — 7-Day Deep Dive

**Goal:** Master Kubernetes workload types and advanced scheduling techniques for production SRE/DBRE scenarios.

**Prerequisites:** Complete the [Kubernetes Foundations Tutorial](./kubernetes-foundations-tutorial.md) or equivalent knowledge of Pods, Deployments, and Services.

---

## Table of Contents

1. [Overview & Setup](#overview--setup)
2. [Day 1: ReplicaSets Deep Dive](#day-1-replicasets-deep-dive)
3. [Day 2: DaemonSets — One Pod Per Node](#day-2-daemonsets--one-pod-per-node)
4. [Day 3: Jobs and CronJobs](#day-3-jobs-and-cronjobs)
5. [Day 4: Resource Management](#day-4-resource-management)
6. [Day 5: Node Selectors and Affinity](#day-5-node-selectors-and-affinity)
7. [Day 6: Taints and Tolerations](#day-6-taints-and-tolerations)
8. [Day 7: Advanced Scheduling Patterns](#day-7-advanced-scheduling-patterns)
9. [Comparison Chart](#comparison-chart)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview & Setup

### What You'll Learn

| Workload Type | Purpose | Use Cases |
|---------------|---------|-----------|
| **ReplicaSet** | Maintain N replicas | Base for Deployments |
| **DaemonSet** | One pod per node | Logging, monitoring agents |
| **Job** | Run to completion | Batch processing, migrations |
| **CronJob** | Scheduled jobs | Backups, reports, cleanup |

### Setup Your Lab Environment

```bash
# Start your cluster with multiple nodes (for DaemonSet testing)
# Using kind for multi-node setup
cat <<EOF > kind-multi-node-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
- role: worker
EOF

# Create the cluster
kind create cluster --name workloads-lab --config kind-multi-node-config.yaml

# Verify nodes
kubectl get nodes
```

**Expected Output:**
```
NAME                          STATUS   ROLES           AGE   VERSION
workloads-lab-control-plane   Ready    control-plane   1m    v1.28.0
workloads-lab-worker          Ready    <none>          1m    v1.28.0
workloads-lab-worker2         Ready    <none>          1m    v1.28.0
workloads-lab-worker3         Ready    <none>          1m    v1.28.0
```

---

## Day 1: ReplicaSets Deep Dive

### What is a ReplicaSet?

A **ReplicaSet** ensures that a specified number of pod replicas are running at any time. While you typically use Deployments (which manage ReplicaSets), understanding ReplicaSets is crucial for troubleshooting.

### Key Concepts

- **Desired State**: Number of replicas you want
- **Current State**: Number of replicas actually running
- **Label Selectors**: How ReplicaSet identifies its pods
- **Pod Template**: Blueprint for creating pods

### Hands-on Exercise

#### Step 1: Create a ReplicaSet Directly

Create `nginx-replicaset.yaml`:

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: nginx-replicaset
  labels:
    app: nginx
    tier: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
      tier: frontend
  template:
    metadata:
      labels:
        app: nginx
        tier: frontend
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
```

```bash
# Apply the ReplicaSet
kubectl apply -f nginx-replicaset.yaml

# Watch the pods being created
kubectl get pods -l app=nginx --watch

# Check ReplicaSet status
kubectl get replicasets
kubectl describe replicaset nginx-replicaset
```

**Expected Output:**
```
NAME               DESIRED   CURRENT   READY   AGE
nginx-replicaset   3         3         3       30s
```

#### Step 2: Test Self-Healing

```bash
# Get current pods
kubectl get pods -l app=nginx

# Delete one pod
kubectl delete pod <pod-name>

# Watch ReplicaSet recreate it immediately
kubectl get pods -l app=nginx --watch
```

**What happens:** ReplicaSet detects the missing pod and creates a new one to maintain the desired count of 3.

#### Step 3: Scale the ReplicaSet

```bash
# Scale up to 5 replicas
kubectl scale replicaset nginx-replicaset --replicas=5

# Verify scaling
kubectl get pods -l app=nginx
kubectl get replicaset nginx-replicaset

# Scale down to 2 replicas
kubectl scale replicaset nginx-replicaset --replicas=2

# Watch pods being terminated
kubectl get pods -l app=nginx --watch
```

#### Step 4: Update Image (The Problem)

```bash
# Try to update the image
kubectl set image replicaset/nginx-replicaset nginx=nginx:1.22

# Check the ReplicaSet
kubectl describe replicaset nginx-replicaset

# Notice: Existing pods are NOT updated!
kubectl get pods -l app=nginx -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'
```

**Key Insight:** ReplicaSets don't perform rolling updates. You need to manually delete pods for them to pick up the new image. This is why we use Deployments!

```bash
# Delete all pods to force recreation with new image
kubectl delete pods -l app=nginx

# Now they'll use the new image
kubectl get pods -l app=nginx -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'
```

#### Step 5: Label Selectors (Advanced)

Create `advanced-replicaset.yaml`:

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: advanced-replicaset
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
    matchExpressions:
    - key: environment
      operator: In
      values:
      - production
      - staging
    - key: tier
      operator: NotIn
      values:
      - backend-legacy
  template:
    metadata:
      labels:
        app: myapp
        environment: production
        tier: frontend
    spec:
      containers:
      - name: app
        image: nginx:1.21
        ports:
        - containerPort: 80
```

```bash
# Apply the advanced ReplicaSet
kubectl apply -f advanced-replicaset.yaml

# Check the pods
kubectl get pods -l app=myapp

# Try to create a pod that matches the selector
kubectl run manual-pod --image=nginx --labels="app=myapp,environment=staging,tier=frontend"

# The ReplicaSet will try to manage it!
kubectl get pods -l app=myapp
```

### Key Concepts Learned

- **ReplicaSets maintain desired state**: Always ensures N replicas
- **Label selectors are powerful**: Can use matchLabels and matchExpressions
- **No rolling updates**: ReplicaSets don't update existing pods
- **Self-healing**: Automatically recreates failed pods
- **Manual scaling**: Easy to scale up/down

### Cleanup

```bash
kubectl delete replicaset nginx-replicaset advanced-replicaset
kubectl delete pod manual-pod
```

---

## Day 2: DaemonSets — One Pod Per Node

### What is a DaemonSet?

A **DaemonSet** ensures that all (or some) nodes run a copy of a pod. As nodes are added to the cluster, pods are automatically added to them.

### Common Use Cases

- **Log Collection**: Fluentd, Filebeat, Logstash
- **Monitoring**: Node exporters, monitoring agents
- **Storage**: Ceph, GlusterFS daemons
- **Network**: CNI plugins, kube-proxy
- **Security**: Security scanners, vulnerability agents

### Hands-on Exercise

#### Step 1: Create a Simple DaemonSet

Create `node-info-daemonset.yaml`:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-info
  labels:
    app: node-info
spec:
  selector:
    matchLabels:
      app: node-info
  template:
    metadata:
      labels:
        app: node-info
    spec:
      containers:
      - name: node-info
        image: busybox
        command:
        - sh
        - -c
        - |
          while true; do
            echo "Node: $NODE_NAME"
            echo "Pod: $POD_NAME"
            echo "Namespace: $POD_NAMESPACE"
            sleep 30
          done
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        resources:
          requests:
            memory: "32Mi"
            cpu: "50m"
          limits:
            memory: "64Mi"
            cpu: "100m"
```

```bash
# Apply the DaemonSet
kubectl apply -f node-info-daemonset.yaml

# Check DaemonSet status
kubectl get daemonsets
kubectl get pods -l app=node-info -o wide

# Verify one pod per node
kubectl get nodes
kubectl get pods -l app=node-info -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName
```

**Expected Output:**
```
NAME                 DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
node-info            3         3         3       3            3           <none>          30s

NAME              NODE
node-info-abc12   workloads-lab-worker
node-info-def34   workloads-lab-worker2
node-info-ghi56   workloads-lab-worker3
```

#### Step 2: Real-World Example — Log Collector

Create `fluentd-daemonset.yaml`:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: kube-system
  labels:
    app: fluentd
    tier: logging
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
        tier: logging
    spec:
      # Important: DaemonSets often need elevated permissions
      serviceAccountName: fluentd
      tolerations:
      # Allow running on control-plane nodes
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16-1
        resources:
          requests:
            memory: "200Mi"
            cpu: "100m"
          limits:
            memory: "500Mi"
            cpu: "500m"
        volumeMounts:
        # Mount host logs
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

Create the ServiceAccount first:

```bash
# Create ServiceAccount
kubectl create serviceaccount fluentd -n kube-system

# Create ClusterRole and ClusterRoleBinding
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluentd
rules:
- apiGroups: [""]
  resources:
  - pods
  - namespaces
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: fluentd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: fluentd
subjects:
- kind: ServiceAccount
  name: fluentd
  namespace: kube-system
EOF

# Apply the DaemonSet
kubectl apply -f fluentd-daemonset.yaml

# Check status
kubectl get daemonsets -n kube-system
kubectl get pods -n kube-system -l app=fluentd -o wide
```

#### Step 3: Update a DaemonSet (Rolling Update)

```bash
# Check current image
kubectl get daemonset node-info -o jsonpath='{.spec.template.spec.containers[0].image}'

# Update the image
kubectl set image daemonset/node-info node-info=busybox:1.36

# Watch the rolling update
kubectl rollout status daemonset/node-info

# Check rollout history
kubectl rollout history daemonset/node-info
```

#### Step 4: Node Selectors with DaemonSet

Create `monitoring-daemonset.yaml`:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      # Only run on nodes with this label
      nodeSelector:
        monitoring: "enabled"
      containers:
      - name: agent
        image: busybox
        command: ["sh", "-c", "echo Monitoring node && sleep 3600"]
        resources:
          requests:
            memory: "50Mi"
            cpu: "50m"
```

```bash
# Apply the DaemonSet
kubectl apply -f monitoring-daemonset.yaml

# Check pods - should be 0 initially
kubectl get pods -l app=monitoring-agent

# Label a node to enable monitoring
kubectl label node workloads-lab-worker monitoring=enabled

# Watch pod get created
kubectl get pods -l app=monitoring-agent -o wide

# Label another node
kubectl label node workloads-lab-worker2 monitoring=enabled

# Now you have 2 pods
kubectl get pods -l app=monitoring-agent -o wide

# Remove label
kubectl label node workloads-lab-worker monitoring-
kubectl get pods -l app=monitoring-agent -o wide
```

### Key Concepts Learned

- **One pod per node**: DaemonSets ensure coverage across all nodes
- **Automatic scaling**: Pods added/removed as nodes join/leave
- **Rolling updates**: DaemonSets support controlled updates
- **Node selectors**: Can target specific nodes
- **System workloads**: Perfect for infrastructure services

### Comparison: ReplicaSet vs DaemonSet

| Feature | ReplicaSet | DaemonSet |
|---------|-----------|-----------|
| **Pod Count** | Fixed number (e.g., 3) | One per (matching) node |
| **Scaling** | Manual or HPA | Automatic with nodes |
| **Use Case** | Application replicas | System services |
| **Scheduling** | Kube-scheduler | Per-node |
| **Example** | Web servers, APIs | Logs, monitoring |

---

## Day 3: Jobs and CronJobs

### What are Jobs?

A **Job** creates one or more pods and ensures they successfully complete. Unlike Deployments, Jobs are meant to run to completion.

### Job Types

- **Non-parallel Jobs**: Run single pod to completion
- **Parallel Jobs with fixed completion count**: Run N pods
- **Parallel Jobs with work queue**: Process queue items

### Hands-on Exercise

#### Step 1: Simple Job

Create `simple-job.yaml`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pi-calculation
spec:
  template:
    spec:
      containers:
      - name: pi
        image: perl:5.34
        command: ["perl", "-Mbignum=bpi", "-wle", "print bpi(2000)"]
      restartPolicy: Never
  backoffLimit: 4
```

```bash
# Create the job
kubectl apply -f simple-job.yaml

# Watch job progress
kubectl get jobs --watch

# Check pods
kubectl get pods -l job-name=pi-calculation

# View output
kubectl logs $(kubectl get pods -l job-name=pi-calculation -o jsonpath='{.items[0].metadata.name}')

# Check job details
kubectl describe job pi-calculation
```

**Expected Output:**
```
NAME              COMPLETIONS   DURATION   AGE
pi-calculation    1/1           5s         10s
```

#### Step 2: Parallel Job

Create `parallel-job.yaml`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: parallel-processing
spec:
  completions: 10
  parallelism: 3
  template:
    spec:
      containers:
      - name: worker
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Worker starting: $HOSTNAME"
          sleep $((RANDOM % 10 + 5))
          echo "Worker completed: $HOSTNAME"
      restartPolicy: Never
  backoffLimit: 6
```

```bash
# Create the parallel job
kubectl apply -f parallel-job.yaml

# Watch it process (3 pods at a time)
kubectl get pods -l job-name=parallel-processing --watch

# Check job status
kubectl get job parallel-processing

# View logs from different workers
kubectl logs -l job-name=parallel-processing --prefix=true
```

#### Step 3: Database Backup Job

Create `db-backup-job.yaml`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: mariadb-backup
spec:
  template:
    spec:
      containers:
      - name: backup
        image: mariadb:10.11
        command:
        - sh
        - -c
        - |
          echo "Starting backup at $(date)"
          mysqldump -h mariadb -u root -prootpassword --all-databases > /backup/backup-$(date +%Y%m%d-%H%M%S).sql
          echo "Backup completed at $(date)"
          ls -lh /backup/
        volumeMounts:
        - name: backup-storage
          mountPath: /backup
        env:
        - name: MYSQL_PWD
          value: "rootpassword"
      restartPolicy: OnFailure
      volumes:
      - name: backup-storage
        emptyDir: {}
  backoffLimit: 3
  ttlSecondsAfterFinished: 100
```

```bash
# Apply the backup job
kubectl apply -f db-backup-job.yaml

# Check status
kubectl get jobs
kubectl get pods -l job-name=mariadb-backup

# View logs
kubectl logs -l job-name=mariadb-backup
```

#### Step 4: CronJobs — Scheduled Tasks

Create `cleanup-cronjob.yaml`:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-cleanup
spec:
  schedule: "0 2 * * *"  # Run at 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: busybox
            command:
            - sh
            - -c
            - |
              echo "Starting cleanup at $(date)"
              echo "Cleaning old files..."
              echo "Cleanup completed at $(date)"
          restartPolicy: OnFailure
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

```bash
# Apply the CronJob
kubectl apply -f cleanup-cronjob.yaml

# Check CronJob
kubectl get cronjobs
kubectl describe cronjob nightly-cleanup
```

#### Step 5: Test CronJob Immediately

Create `frequent-cronjob.yaml`:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: every-minute-test
spec:
  schedule: "*/1 * * * *"  # Every minute
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: hello
            image: busybox
            command:
            - sh
            - -c
            - echo "Hello from CronJob at $(date)"
          restartPolicy: OnFailure
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

```bash
# Apply the frequent CronJob
kubectl apply -f frequent-cronjob.yaml

# Wait a minute and check
sleep 70
kubectl get cronjobs
kubectl get jobs -l parent-cronjob=every-minute-test

# Check logs (newest job pod)
kubectl logs $(kubectl get pods -l job-name --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | tail -1)

# Manually trigger a CronJob
kubectl create job manual-test --from=cronjob/every-minute-test

# Suspend the CronJob
kubectl patch cronjob every-minute-test -p '{"spec":{"suspend":true}}'
```

### CronJob Schedule Format

```
# ┌───────────── minute (0 - 59)
# │ ┌───────────── hour (0 - 23)
# │ │ ┌───────────── day of month (1 - 31)
# │ │ │ ┌───────────── month (1 - 12)
# │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
# │ │ │ │ │
# * * * * *
```

Common schedules:
```bash
"0 0 * * *"      # Daily at midnight
"0 */6 * * *"    # Every 6 hours
"*/15 * * * *"   # Every 15 minutes
"0 9 * * 1-5"    # Weekdays at 9 AM
"0 0 1 * *"      # First day of month
```

### Key Concepts Learned

- **Jobs run to completion**: Unlike Deployments that run forever
- **Parallel processing**: Run multiple pods simultaneously
- **Restart policies**: Never vs OnFailure
- **CronJobs**: Scheduled jobs using cron syntax
- **TTL**: Automatic cleanup with ttlSecondsAfterFinished

---

## Day 4: Resource Management

### Understanding Resources

Every container should specify:
- **Requests**: Minimum resources guaranteed
- **Limits**: Maximum resources allowed

### Resource Types

- **CPU**: Measured in millicores (m) or cores
  - 1 CPU = 1000m
  - 500m = 0.5 CPU
- **Memory**: Measured in bytes (Ki, Mi, Gi)
  - 1 Ki = 1024 bytes
  - 1 Mi = 1024 Ki
  - 1 Gi = 1024 Mi

### Hands-on Exercise

#### Step 1: Pod with Resource Requests/Limits

Create `resource-demo.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-demo
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```

```bash
# Apply the pod
kubectl apply -f resource-demo.yaml

# Check resource allocation
kubectl describe node | grep -A 5 "Allocated resources"

# Check pod resources
kubectl describe pod resource-demo | grep -A 10 "Requests\|Limits"
```

#### Step 2: Stress Test — Memory Limit

Create `memory-stress.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-stress
spec:
  containers:
  - name: stress
    image: polinux/stress
    command: ["stress"]
    args: ["--vm", "1", "--vm-bytes", "150M", "--vm-hang", "1"]
    resources:
      requests:
        memory: "50Mi"
      limits:
        memory: "100Mi"  # Will be OOMKilled!
```

```bash
# Apply and watch it fail
kubectl apply -f memory-stress.yaml

# Watch pod status
kubectl get pod memory-stress --watch

# Check why it failed
kubectl describe pod memory-stress | grep -A 5 "Last State"
```

**Expected:** Pod will be OOMKilled (Out Of Memory) because it tries to use 150Mi but limit is 100Mi.

#### Step 3: CPU Throttling

Create `cpu-stress.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cpu-stress
spec:
  containers:
  - name: stress
    image: polinux/stress
    command: ["stress"]
    args: ["--cpu", "2"]
    resources:
      requests:
        cpu: "100m"
      limits:
        cpu: "200m"  # Will be throttled
```

```bash
# Apply the pod
kubectl apply -f cpu-stress.yaml

# Watch CPU usage (if metrics-server is installed)
kubectl top pod cpu-stress

# Check throttling (from node)
kubectl exec -it cpu-stress -- sh -c "cat /sys/fs/cgroup/cpu/cpu.stat"
```

#### Step 4: LimitRange — Namespace Defaults

Create `namespace-with-limits.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: limited-namespace
---
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-limits
  namespace: limited-namespace
spec:
  limits:
  - default:
      memory: "512Mi"
      cpu: "500m"
    defaultRequest:
      memory: "256Mi"
      cpu: "250m"
    max:
      memory: "1Gi"
      cpu: "1000m"
    min:
      memory: "128Mi"
      cpu: "100m"
    type: Container
```

```bash
# Create namespace with limits
kubectl apply -f namespace-with-limits.yaml

# Check LimitRange
kubectl describe limitrange -n limited-namespace

# Create pod without specifying resources
kubectl run test-pod --image=nginx -n limited-namespace

# Check that defaults were applied
kubectl describe pod test-pod -n limited-namespace | grep -A 10 "Requests\|Limits"
```

#### Step 5: ResourceQuota — Namespace Budget

Create `resource-quota.yaml`:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: limited-namespace
spec:
  hard:
    requests.cpu: "2"
    requests.memory: "4Gi"
    limits.cpu: "4"
    limits.memory: "8Gi"
    pods: "10"
    services: "5"
    persistentvolumeclaims: "3"
```

```bash
# Apply quota
kubectl apply -f resource-quota.yaml

# Check quota
kubectl describe quota -n limited-namespace

# Try to exceed quota
kubectl create deployment nginx --image=nginx --replicas=15 -n limited-namespace

# Check why some pods didn't start
kubectl get events -n limited-namespace --sort-by='.lastTimestamp'
```

### Best Practices

```yaml
# Good: Requests = Limits (Guaranteed QoS)
resources:
  requests:
    memory: "256Mi"
    cpu: "500m"
  limits:
    memory: "256Mi"
    cpu: "500m"

# Good: Requests < Limits (Burstable QoS)
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "1000m"

# Bad: No requests (BestEffort QoS, first to be evicted)
# No resources specified
```

### Key Concepts Learned

- **Requests**: Guaranteed resources for scheduling
- **Limits**: Maximum resources, enforced
- **QoS Classes**: Guaranteed, Burstable, BestEffort
- **LimitRange**: Default limits per namespace
- **ResourceQuota**: Total limits per namespace

---

## Day 5: Node Selectors and Affinity

### Node Selection Strategies

1. **nodeSelector**: Simple label-based selection
2. **Node Affinity**: Advanced rules with preferences
3. **Pod Affinity**: Schedule pods near other pods
4. **Pod Anti-Affinity**: Keep pods apart

### Hands-on Exercise

#### Step 1: Label Nodes

```bash
# Check current nodes
kubectl get nodes --show-labels

# Label nodes by tier
kubectl label node workloads-lab-worker tier=frontend
kubectl label node workloads-lab-worker2 tier=backend
kubectl label node workloads-lab-worker3 tier=database

# Label nodes by disk type
kubectl label node workloads-lab-worker2 disk=ssd
kubectl label node workloads-lab-worker3 disk=ssd

# Check labels
kubectl get nodes -L tier,disk
```

#### Step 2: NodeSelector (Simple)

Create `frontend-nodeSelector.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      nodeSelector:
        tier: frontend
      containers:
      - name: nginx
        image: nginx
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
```

```bash
# Apply deployment
kubectl apply -f frontend-nodeSelector.yaml

# Check where pods landed
kubectl get pods -l app=frontend -o wide

# They should all be on workloads-lab-worker
```

#### Step 3: Node Affinity (Required)

Create `database-affinity.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  replicas: 2
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: tier
                operator: In
                values:
                - database
              - key: disk
                operator: In
                values:
                - ssd
      containers:
      - name: mariadb
        image: mariadb:10.11
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "password"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
```

```bash
# Apply deployment
kubectl apply -f database-affinity.yaml

# Check placement
kubectl get pods -l app=database -o wide

# Pods should only be on workloads-lab-worker3 (tier=database AND disk=ssd)
```

#### Step 4: Node Affinity (Preferred)

Create `backend-preferred-affinity.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 5
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 80
            preference:
              matchExpressions:
              - key: disk
                operator: In
                values:
                - ssd
          - weight: 20
            preference:
              matchExpressions:
              - key: tier
                operator: In
                values:
                - backend
      containers:
      - name: app
        image: nginx
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
```

```bash
# Apply deployment
kubectl apply -f backend-preferred-affinity.yaml

# Check distribution
kubectl get pods -l app=backend -o wide

# Pods will prefer SSD nodes but can go elsewhere if needed
```

#### Step 5: Pod Affinity (Co-location)

Create `cache-with-affinity.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - backend
            topologyKey: kubernetes.io/hostname
      containers:
      - name: redis
        image: redis:7
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
```

```bash
# Apply deployment
kubectl apply -f cache-with-affinity.yaml

# Check co-location
kubectl get pods -l app=cache -o wide
kubectl get pods -l app=backend -o wide

# Cache pods should be on same nodes as backend pods
```

#### Step 6: Pod Anti-Affinity (Spread)

Create `web-anti-affinity.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-spread
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-spread
  template:
    metadata:
      labels:
        app: web-spread
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - web-spread
            topologyKey: kubernetes.io/hostname
      containers:
      - name: nginx
        image: nginx
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
```

```bash
# Apply deployment
kubectl apply -f web-anti-affinity.yaml

# Check spread
kubectl get pods -l app=web-spread -o wide

# Each pod should be on a different node
```

### Affinity Operators

| Operator | Description |
|----------|-------------|
| `In` | Label value in list |
| `NotIn` | Label value not in list |
| `Exists` | Label key exists |
| `DoesNotExist` | Label key doesn't exist |
| `Gt` | Greater than (numeric) |
| `Lt` | Less than (numeric) |

### Key Concepts Learned

- **nodeSelector**: Simple node selection
- **Node Affinity**: Complex node selection rules
- **Pod Affinity**: Schedule near other pods
- **Pod Anti-Affinity**: Spread pods apart
- **Topology Keys**: Define scheduling domains

---

## Day 6: Taints and Tolerations

### What are Taints and Tolerations?

- **Taints**: Applied to nodes, repel pods
- **Tolerations**: Applied to pods, allow scheduling on tainted nodes

### Use Cases

- Dedicate nodes to specific workloads
- Prevent scheduling on special hardware
- Evict pods from nodes (drain)
- Isolate production workloads

### Taint Effects

| Effect | Description |
|--------|-------------|
| `NoSchedule` | Don't schedule new pods |
| `PreferNoSchedule` | Avoid scheduling if possible |
| `NoExecute` | Evict existing pods |

### Hands-on Exercise

#### Step 1: Taint a Node

```bash
# Taint worker node for production only
kubectl taint nodes workloads-lab-worker environment=production:NoSchedule

# Taint worker2 for databases only
kubectl taint nodes workloads-lab-worker2 workload=database:NoSchedule

# Taint worker3 with NoExecute (will evict pods)
kubectl taint nodes workloads-lab-worker3 maintenance=true:NoExecute

# Check taints
kubectl describe node workloads-lab-worker | grep Taints
kubectl describe node workloads-lab-worker2 | grep Taints
kubectl describe node workloads-lab-worker3 | grep Taints
```

#### Step 2: Test Taints

```bash
# Try to create a pod (it will likely remain Pending without tolerations)
kubectl run test-pod --image=nginx

# Check where it landed
kubectl get pod test-pod -o wide

# Describe events to see taint-related scheduling messages
kubectl describe pod test-pod | sed -n '/Events:/,$p'

# It won't schedule on tainted worker nodes!
```

#### Step 3: Tolerations

Create `production-app.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
    spec:
      tolerations:
      - key: "environment"
        operator: "Equal"
        value: "production"
        effect: "NoSchedule"
      containers:
      - name: nginx
        image: nginx
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
```

```bash
# Apply deployment
kubectl apply -f production-app.yaml

# Check placement
kubectl get pods -l app=production-app -o wide

# Pods can now schedule on workloads-lab-worker
```

#### Step 4: Database with Toleration

Create `database-toleration.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: database-app
  template:
    metadata:
      labels:
        app: database-app
    spec:
      tolerations:
      - key: "workload"
        operator: "Equal"
        value: "database"
        effect: "NoSchedule"
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: workload
                operator: In
                values:
                - database
      containers:
      - name: mariadb
        image: mariadb:10.11
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "password"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
```

```bash
# Apply deployment
kubectl apply -f database-toleration.yaml

# Check placement
kubectl get pods -l app=database-app -o wide

# Pods should be on workloads-lab-worker2
```

#### Step 5: Wildcard Tolerations

Create `tolerate-all.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tolerate-everything
spec:
  tolerations:
  - operator: "Exists"
  containers:
  - name: nginx
    image: nginx
```

```bash
# Apply pod
kubectl apply -f tolerate-all.yaml

# It can schedule on any node
kubectl get pod tolerate-everything -o wide
```

#### Step 6: NoExecute and Grace Period

Create `eviction-test.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: eviction-test
spec:
  tolerations:
  - key: "maintenance"
    operator: "Equal"
    value: "true"
    effect: "NoExecute"
    tolerationSeconds: 30  # Evict after 30 seconds
  containers:
  - name: nginx
    image: nginx
```

```bash
# Remove previous NoExecute taint
kubectl taint nodes workloads-lab-worker3 maintenance=true:NoExecute-

# Apply pod on worker3
kubectl apply -f eviction-test.yaml

# Add NoExecute taint again
kubectl taint nodes workloads-lab-worker3 maintenance=true:NoExecute

# Watch pod get evicted after 30 seconds
kubectl get pod eviction-test --watch
```

#### Step 7: Remove Taints

```bash
# Remove all taints
kubectl taint nodes workloads-lab-worker environment=production:NoSchedule-
kubectl taint nodes workloads-lab-worker2 workload=database:NoSchedule-
kubectl taint nodes workloads-lab-worker3 maintenance=true:NoExecute-

# Verify
kubectl describe nodes | grep Taints
```

### Common Taint Scenarios

```bash
# Dedicated GPU node
kubectl taint nodes gpu-node hardware=gpu:NoSchedule

# Maintenance mode
kubectl taint nodes node1 maintenance=true:NoExecute

# Production isolation
kubectl taint nodes prod-node environment=production:NoSchedule

# Spot instances (might be evicted)
kubectl taint nodes spot-node instance-type=spot:PreferNoSchedule
```

### Key Concepts Learned

- **Taints repel pods**: Unless they have tolerations
- **NoSchedule**: Prevent new pods
- **NoExecute**: Evict existing pods
- **tolerationSeconds**: Delay eviction
- **Combine with affinity**: For complete control

---

## Day 7: Advanced Scheduling Patterns

### Real-World Patterns

Let's combine everything we've learned into production-ready patterns.

#### Pattern 1: High-Availability Multi-Tier Application

Create `ha-application.yaml`:

```yaml
# Frontend: Spread across nodes, prefer low-load nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-ha
spec:
  replicas: 4
  selector:
    matchLabels:
      app: frontend-ha
      tier: frontend
  template:
    metadata:
      labels:
        app: frontend-ha
        tier: frontend
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - frontend-ha
              topologyKey: kubernetes.io/hostname
      containers:
      - name: nginx
        image: nginx:1.21
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
---
# Backend: Co-locate with cache, spread across nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-ha
spec:
  replicas: 6
  selector:
    matchLabels:
      app: backend-ha
      tier: backend
  template:
    metadata:
      labels:
        app: backend-ha
        tier: backend
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - backend-ha
            topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        image: nginx:1.21
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
---
# Cache: Co-locate with backend
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-ha
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cache-ha
      tier: cache
  template:
    metadata:
      labels:
        app: cache-ha
        tier: cache
    spec:
      affinity:
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: tier
                  operator: In
                  values:
                  - backend
              topologyKey: kubernetes.io/hostname
      containers:
      - name: redis
        image: redis:7
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

```bash
# Deploy the stack
kubectl apply -f ha-application.yaml

# Visualize the deployment
kubectl get pods -o wide | sort -k7
```

#### Pattern 2: Monitoring DaemonSet with Tolerations

Create `monitoring-complete.yaml`:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      tolerations:
      # Tolerate all taints
      - operator: Exists
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        - --collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($|/)
        - --collector.filesystem.fs-types-exclude=^(autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tracefs)$
        ports:
        - containerPort: 9100
          hostPort: 9100
          name: metrics
        resources:
          requests:
            memory: "100Mi"
            cpu: "100m"
          limits:
            memory: "200Mi"
            cpu: "500m"
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host/root
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
```

```bash
# Create namespace
kubectl create namespace monitoring

# Deploy monitoring
kubectl apply -f monitoring-complete.yaml

# Check deployment
kubectl get daemonsets -n monitoring
kubectl get pods -n monitoring -o wide
```

#### Pattern 3: Scheduled Backup with Priority

Create `backup-cronjob-priority.yaml`:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority-backup
value: 1000
globalDefault: false
description: "High priority for backup jobs"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup-priority
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          priorityClassName: high-priority-backup
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                - matchExpressions:
                  - key: disk
                    operator: In
                    values:
                    - ssd
          containers:
          - name: backup
            image: mariadb:10.11
            command:
            - sh
            - -c
            - |
              echo "High-priority backup starting"
              sleep 10
              echo "Backup complete"
            resources:
              requests:
                memory: "512Mi"
                cpu: "500m"
              limits:
                memory: "1Gi"
                cpu: "1000m"
          restartPolicy: OnFailure
      backoffLimit: 3
```

```bash
# Deploy with priority
kubectl apply -f backup-cronjob-priority.yaml

# Check priority class
kubectl get priorityclasses

# Trigger backup manually
kubectl create job test-backup --from=cronjob/database-backup-priority

# Check job
kubectl get jobs
kubectl describe job test-backup
```

#### Pattern 4: Pod Disruption Budget (PDB)

Create `pdb-example.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: critical-app
  template:
    metadata:
      labels:
        app: critical-app
    spec:
      containers:
      - name: nginx
        image: nginx
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-app-pdb
spec:
  minAvailable: 3  # Always keep at least 3 pods running
  selector:
    matchLabels:
      app: critical-app
```

```bash
# Deploy with PDB
kubectl apply -f pdb-example.yaml

# Check PDB
kubectl get pdb
kubectl describe pdb critical-app-pdb

# Try to drain a node (will respect PDB)
# kubectl drain workloads-lab-worker --ignore-daemonsets --delete-emptydir-data
```

### Production Checklist

```yaml
# Complete production-ready pod specification
apiVersion: v1
kind: Pod
metadata:
  name: production-ready-pod
  labels:
    app: myapp
    version: v1.0
    environment: production
spec:
  # Resource management
  containers:
  - name: app
    image: myapp:1.0
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "1000m"
    
    # Health checks
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 10
    
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
    
    # Lifecycle hooks
    lifecycle:
      preStop:
        exec:
          command: ["/bin/sh", "-c", "sleep 15"]
  
  # Scheduling
  priorityClassName: high-priority-backup
  
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - myapp
        topologyKey: kubernetes.io/hostname
  
  tolerations:
  - key: "production"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"
  
  # Security
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  
  # DNS config
  dnsPolicy: ClusterFirst
  
  # Restart policy
  restartPolicy: Always
```

---

## Comparison Chart

### Workload Type Comparison

| Feature | ReplicaSet | DaemonSet | Job | CronJob | Deployment | StatefulSet |
|---------|-----------|-----------|-----|---------|------------|-------------|
| **Purpose** | Maintain N replicas | One per node | Run to completion | Scheduled jobs | Manage ReplicaSets | Ordered, stable apps |
| **Replica Count** | Fixed | Per node | As needed | Per schedule | Fixed | Fixed with order |
| **Updates** | Manual | Rolling | N/A | N/A | Rolling | Rolling (ordered) |
| **Scaling** | Manual | Automatic | N/A | N/A | Manual/Auto | Manual |
| **Restart** | Always | Always | Never/OnFailure | Never/OnFailure | Always | Always |
| **Use Case** | Base primitive | System services | Migrations | Backups | Apps | Databases |

### Scheduling Mechanisms

| Mechanism | Scope | Complexity | Use Case |
|-----------|-------|------------|----------|
| **nodeSelector** | Node | Simple | Basic node selection |
| **Node Affinity** | Node | Medium | Complex node rules |
| **Pod Affinity** | Pod | High | Co-locate pods |
| **Pod Anti-Affinity** | Pod | High | Spread pods |
| **Taints** | Node | Medium | Repel pods |
| **Tolerations** | Pod | Medium | Allow on tainted nodes |

---

## Troubleshooting Guide

### Common Issues

#### Issue 1: Pod Stuck in Pending with Node Affinity

```bash
# Check why pod is pending
kubectl describe pod <pod-name>

# Look for:
# - "0/N nodes are available: N node(s) didn't match node selector"
# - "0/N nodes are available: N node(s) didn't match pod affinity rules"

# Solutions:
# 1. Check node labels
kubectl get nodes --show-labels

# 2. Relax affinity rules (change required to preferred)
# 3. Add more nodes with required labels
```

#### Issue 2: DaemonSet Pods Not on All Nodes

```bash
# Check DaemonSet status
kubectl describe daemonset <daemonset-name>

# Common causes:
# - Node taints (DaemonSet needs tolerations)
# - Node selectors excluding nodes
# - Resource constraints

# Check node taints
kubectl describe nodes | grep -A 3 Taints

# Add tolerations to DaemonSet
```

#### Issue 3: Job Never Completes

```bash
# Check job status
kubectl describe job <job-name>

# Check pod logs
kubectl logs -l job-name=<job-name>

# Common causes:
# - Wrong restartPolicy (should be Never or OnFailure)
# - Container doesn't exit
# - backoffLimit reached

# Fix: Update job spec and recreate
```

#### Issue 4: Resource Quota Exceeded

```bash
# Check quota usage
kubectl describe quota -n <namespace>

# Check resource usage
kubectl top pods -n <namespace>

# Solutions:
# 1. Increase quota
# 2. Reduce resource requests
# 3. Delete unused pods
```

### Debugging Commands

```bash
# Check scheduling decisions
kubectl get events --sort-by='.lastTimestamp' | grep <pod-name>

# Check node capacity
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check pod scheduling details
kubectl get pod <pod-name> -o yaml | grep -A 20 "affinity\|nodeSelector\|tolerations"

# Force delete stuck pod
kubectl delete pod <pod-name> --grace-period=0 --force

# Check scheduler logs
kubectl logs -n kube-system -l component=kube-scheduler
```

---

## Summary

### What You've Mastered

1. **ReplicaSets**: Foundation of pod replication
2. **DaemonSets**: System services on every node
3. **Jobs/CronJobs**: Batch and scheduled workloads
4. **Resource Management**: Requests, limits, quotas
5. **Node Selection**: nodeSelector, affinity, anti-affinity
6. **Taints/Tolerations**: Node isolation and dedication
7. **Production Patterns**: Real-world scheduling strategies

### Quick Reference

```bash
# ReplicaSet
kubectl scale rs <name> --replicas=N

# DaemonSet
kubectl rollout status daemonset <name>

# Job
kubectl create job <name> --image=<image>

# CronJob
kubectl create cronjob <name> --schedule="* * * * *" --image=<image>

# Node labels
kubectl label node <node> key=value

# Taints
kubectl taint nodes <node> key=value:Effect

# Affinity debugging
kubectl describe pod <pod> | grep -A 20 "Node-Selectors\|Tolerations\|Events"
```

### Next Steps

1. **Horizontal Pod Autoscaler (HPA)**: Automatic scaling based on metrics
2. **Vertical Pod Autoscaler (VPA)**: Automatic resource adjustment
3. **Cluster Autoscaler**: Automatic node scaling
4. **Custom Schedulers**: Build your own scheduling logic
5. **Descheduler**: Rebalance pods across nodes

---

## Additional Resources

- [Kubernetes Scheduling Framework](https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/)
- [Managing Resources for Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Assigning Pods to Nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Pod Priority and Preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)

---

**Practice Repository:** Create your own examples and scenarios to solidify these concepts. The best way to learn Kubernetes is by breaking things and fixing them!


