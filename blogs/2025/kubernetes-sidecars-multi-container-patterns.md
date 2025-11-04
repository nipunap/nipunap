# Kubernetes Sidecars & Multi-Container Patterns — Complete Guide

**Goal:** Master sidecar containers, init containers, and multi-container pod patterns for production SRE/DBRE workloads.

**Prerequisites:** Basic Kubernetes knowledge ([Kubernetes Foundations Tutorial](./kubernetes-foundations-tutorial.md)) and understanding of Pods and Containers.

---

## Table of Contents

1. [Introduction to Multi-Container Pods](#introduction-to-multi-container-pods)
2. [Day 1: Sidecar Pattern Fundamentals](#day-1-sidecar-pattern-fundamentals)
3. [Day 2: Init Containers](#day-2-init-containers)
4. [Day 3: Logging Sidecars](#day-3-logging-sidecars)
5. [Day 4: Service Mesh Sidecars](#day-4-service-mesh-sidecars)
6. [Day 5: Ambassador & Adapter Patterns](#day-5-ambassador--adapter-patterns)
7. [Day 6: Monitoring & Observability Sidecars](#day-6-monitoring--observability-sidecars)
8. [Day 7: Advanced Patterns & Best Practices](#day-7-advanced-patterns--best-practices)
9. [Pattern Comparison](#pattern-comparison)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Introduction to Multi-Container Pods

### What are Multi-Container Pods?

In Kubernetes, a **Pod** is the smallest deployable unit that can contain one or more containers. These containers share:
- **Network namespace**: Same IP address, can communicate via localhost
- **Storage volumes**: Shared filesystem access
- **IPC namespace**: Inter-process communication
- **Lifecycle**: Start and stop together

### Common Patterns

| Pattern | Purpose | Example |
|---------|---------|---------|
| **Sidecar** | Extend/enhance main container | Log shipping, monitoring |
| **Ambassador** | Proxy connections | Database proxy, API gateway |
| **Adapter** | Normalize/transform output | Metrics conversion, log formatting |
| **Init Container** | Setup before main container | DB migrations, config fetching |

### Why Use Sidecars?

- **Separation of Concerns**: Each container has a single responsibility
- **Reusability**: Sidecar containers can be reused across applications
- **Independent Scaling**: Different resource requirements
- **Technology Diversity**: Mix languages and tools
- **Security**: Isolate sensitive operations

---

## Day 1: Sidecar Pattern Fundamentals

### What is a Sidecar?

A **sidecar container** runs alongside the main application container in the same Pod, providing supporting functionality without modifying the main application.

### Hands-on Exercise

#### Step 1: Simple Sidecar Example

Create `basic-sidecar.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-with-sidecar
  labels:
    app: web-demo
spec:
  containers:
  # Main application container
  - name: web-app
    image: nginx
    ports:
    - containerPort: 80
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
  
  # Sidecar container for log processing
  - name: log-processor
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Log processor started"
      while true; do
        if [ -f /var/log/nginx/access.log ]; then
          echo "=== Latest access logs ==="
          tail -n 5 /var/log/nginx/access.log
          echo "========================="
        fi
        sleep 10
      done
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
    resources:
      requests:
        memory: "32Mi"
        cpu: "50m"
      limits:
        memory: "64Mi"
        cpu: "100m"
  
  volumes:
  - name: shared-logs
    emptyDir: {}
```

```bash
# Create the pod
kubectl apply -f basic-sidecar.yaml

# Check both containers are running
kubectl get pod web-with-sidecar

# Generate some traffic to nginx
kubectl exec web-with-sidecar -c web-app -- curl localhost

# View sidecar logs processing nginx logs
kubectl logs web-with-sidecar -c log-processor

# View main container logs
kubectl logs web-with-sidecar -c web-app
```

**Expected Output:**
```
NAME               READY   STATUS    RESTARTS   AGE
web-with-sidecar   2/2     Running   0          30s
```

#### Step 2: Sidecar with Shared Volume

Create `file-watcher-sidecar.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: file-watcher
spec:
  containers:
  # Main container writes files
  - name: writer
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Writer starting..."
      counter=0
      while true; do
        echo "Message $counter at $(date)" > /shared/data.txt
        echo "Wrote message $counter"
        counter=$((counter + 1))
        sleep 5
      done
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  
  # Sidecar monitors and processes files
  - name: watcher
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Watcher starting..."
      last_content=""
      while true; do
        if [ -f /shared/data.txt ]; then
          content=$(cat /shared/data.txt)
          if [ "$content" != "$last_content" ]; then
            echo "FILE CHANGED: $content"
            last_content="$content"
          fi
        fi
        sleep 2
      done
    volumeMounts:
    - name: shared-data
      mountPath: /shared
  
  volumes:
  - name: shared-data
    emptyDir: {}
```

```bash
# Create the pod
kubectl apply -f file-watcher-sidecar.yaml

# Watch the watcher sidecar detect changes
kubectl logs file-watcher -c watcher -f

# In another terminal, watch the writer
kubectl logs file-watcher -c writer -f
```

#### Step 3: Health Monitoring Sidecar

Create `health-sidecar.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-health-sidecar
spec:
  containers:
  # Main application
  - name: app
    image: nginx
    ports:
    - containerPort: 80
    livenessProbe:
      httpGet:
        path: /
        port: 80
      initialDelaySeconds: 5
      periodSeconds: 5
  
  # Health monitoring sidecar
  - name: health-monitor
    image: curlimages/curl:latest
    command:
    - sh
    - -c
    - |
      echo "Health monitor started"
      while true; do
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80)
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        if [ "$response" = "200" ]; then
          echo "[$timestamp] ✓ App healthy (HTTP $response)"
        else
          echo "[$timestamp] ✗ App unhealthy (HTTP $response)"
        fi
        sleep 10
      done
    resources:
      requests:
        memory: "32Mi"
        cpu: "50m"
```

```bash
# Create the pod
kubectl apply -f health-sidecar.yaml

# Watch health monitoring
kubectl logs app-with-health-sidecar -c health-monitor -f

# Simulate app failure (kill nginx)
kubectl exec app-with-health-sidecar -c app -- nginx -s stop

# Watch the health monitor detect failure
# Kubernetes will restart the app container due to liveness probe
```

### Key Concepts Learned

- **Shared volumes**: Containers in a pod share storage
- **Localhost communication**: Containers can talk via localhost
- **Independent processes**: Each container runs its own process
- **Resource isolation**: Each container has its own resource limits
- **Lifecycle coupling**: Containers start/stop together

---

## Day 2: Init Containers

### What are Init Containers?

**Init containers** run to completion before the main application containers start. They're perfect for:
- Database migrations
- Configuration generation
- Dependency waiting
- Security setup
- Pre-warming caches

### Key Differences from Regular Containers

| Feature | Init Container | Regular Container |
|---------|---------------|-------------------|
| **Execution** | Sequential, before main | Parallel, continuous |
| **Restart** | On failure only | Based on policy |
| **Probes** | Not supported | Liveness, readiness |
| **Order** | Guaranteed order | No guarantee |

### Hands-on Exercise

#### Step 1: Simple Init Container

Create `init-container-demo.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-demo
spec:
  initContainers:
  - name: init-setup
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Init container starting..."
      echo "Setting up configuration..."
      sleep 3
      echo "Configuration complete" > /work-dir/config.txt
      echo "Init container finished"
    volumeMounts:
    - name: workdir
      mountPath: /work-dir
  
  containers:
  - name: main-app
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Main container starting..."
      if [ -f /work-dir/config.txt ]; then
        echo "Config found: $(cat /work-dir/config.txt)"
      else
        echo "ERROR: Config not found!"
        exit 1
      fi
      echo "App running..."
      sleep 3600
    volumeMounts:
    - name: workdir
      mountPath: /work-dir
  
  volumes:
  - name: workdir
    emptyDir: {}
```

```bash
# Create pod and watch initialization
kubectl apply -f init-container-demo.yaml
kubectl get pod init-demo --watch

# Check init container logs
kubectl logs init-demo -c init-setup

# Check main container logs
kubectl logs init-demo -c main-app
```

**Pod Status Progression:**
```
NAME        READY   STATUS     RESTARTS   AGE
init-demo   0/1     Init:0/1   0          5s
init-demo   0/1     PodInitializing   0   8s
init-demo   1/1     Running    0          10s
```

#### Step 2: Multiple Init Containers (Sequential)

Create `multi-init.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-init
spec:
  initContainers:
  # Init 1: Check dependencies
  - name: check-db
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Checking database availability..."
      # Simulate checking database
      sleep 2
      echo "Database check passed"
  
  # Init 2: Download config
  - name: fetch-config
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Fetching configuration..."
      sleep 2
      echo "app_version=1.0" > /config/app.conf
      echo "debug=true" >> /config/app.conf
      echo "Configuration downloaded"
    volumeMounts:
    - name: config
      mountPath: /config
  
  # Init 3: Run migrations
  - name: run-migrations
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Running database migrations..."
      sleep 2
      echo "Migration 001: Create tables... OK"
      echo "Migration 002: Add indexes... OK"
      echo "Migrations complete"
  
  containers:
  - name: app
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Application starting..."
      echo "Loading config:"
      cat /config/app.conf
      echo "App ready!"
      sleep 3600
    volumeMounts:
    - name: config
      mountPath: /config
  
  volumes:
  - name: config
    emptyDir: {}
```

```bash
# Create and watch sequential initialization
kubectl apply -f multi-init.yaml
kubectl get pod multi-init --watch

# Check each init container's logs
kubectl logs multi-init -c check-db
kubectl logs multi-init -c fetch-config
kubectl logs multi-init -c run-migrations

# Check main app
kubectl logs multi-init -c app
```

#### Step 3: Real-World Example - Database Migration

Create `db-migration-init.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-migrations
data:
  001_create_tables.sql: |
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY,
      username VARCHAR(50),
      email VARCHAR(100)
    );
  002_add_indexes.sql: |
    CREATE INDEX IF NOT EXISTS idx_username ON users(username);
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-with-migrations
spec:
  replicas: 1
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      initContainers:
      # Wait for database to be ready
      - name: wait-for-db
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Waiting for database..."
          # If nc is unavailable, alternative checks:
          #   until (echo > /dev/tcp/mariadb/3306) 2>/dev/null; do sleep 2; done
          #   or: until wget -qO- --spider mariadb:3306; do sleep 2; done
          until nc -z mariadb 3306; do
            echo "Database not ready, waiting..."
            sleep 2
          done
          echo "Database is ready!"
      
      # Run migrations
      - name: run-migrations
        image: mariadb:10.11
        command:
        - sh
        - -c
        - |
          echo "Running migrations..."
          for sql_file in /migrations/*.sql; do
            echo "Executing: $sql_file"
            mysql -h mariadb -u root -prootpassword testdb < "$sql_file"
            echo "✓ Migration complete: $sql_file"
          done
          echo "All migrations completed successfully"
        volumeMounts:
        - name: migrations
          mountPath: /migrations
        env:
        - name: MYSQL_PWD
          value: "rootpassword"
      
      containers:
      - name: webapp
        image: nginx
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
      
      volumes:
      - name: migrations
        configMap:
          name: db-migrations
```

```bash
# First, ensure you have a database running (from previous tutorials)
# If not, create one:
kubectl create deployment mariadb --image=mariadb:10.11
kubectl set env deployment/mariadb MYSQL_ROOT_PASSWORD=rootpassword MYSQL_DATABASE=testdb
kubectl expose deployment mariadb --port=3306

# Wait for database to be ready
kubectl wait --for=condition=available deployment/mariadb --timeout=60s

# Create the migrations ConfigMap
kubectl apply -f db-migration-init.yaml

# Watch the deployment
kubectl get pods -l app=webapp --watch

# Check migration logs
kubectl logs -l app=webapp -c wait-for-db
kubectl logs -l app=webapp -c run-migrations

# Verify migrations ran
kubectl exec -it $(kubectl get pod -l app=mariadb -o jsonpath='{.items[0].metadata.name}') -- \
  mysql -u root -prootpassword testdb -e "SHOW TABLES; DESCRIBE users;"
```

#### Step 4: Init Container with Failure Handling

Create `init-with-retry.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-retry-demo
spec:
  initContainers:
  # This init container will fail initially
  - name: flaky-init
    image: busybox
    command:
    - sh
    - -c
    - |
      # Check if marker file exists (created on 3rd attempt)
      attempt_file="/data/attempts.txt"
      mkdir -p /data
      
      if [ ! -f "$attempt_file" ]; then
        echo "1" > "$attempt_file"
      else
        attempts=$(cat "$attempt_file")
        attempts=$((attempts + 1))
        echo "$attempts" > "$attempt_file"
      fi
      
      current_attempts=$(cat "$attempt_file")
      echo "Attempt #$current_attempts"
      
      if [ "$current_attempts" -lt 3 ]; then
        echo "Simulating failure (attempt $current_attempts)"
        exit 1
      else
        echo "Success on attempt $current_attempts!"
        exit 0
      fi
    volumeMounts:
    - name: data
      mountPath: /data
  
  containers:
  - name: main
    image: busybox
    command: ["sh", "-c", "echo 'Main container started'; sleep 3600"]
  
  volumes:
  - name: data
    emptyDir: {}
  
  restartPolicy: OnFailure
```

```bash
# Create and watch retries
kubectl apply -f init-with-retry.yaml
kubectl get pod init-retry-demo --watch

# You'll see the pod restart a few times before succeeding
# Check events to see the retry behavior
kubectl describe pod init-retry-demo
```

### Key Concepts Learned

- **Sequential execution**: Init containers run in order
- **Guaranteed setup**: Main containers don't start until init succeeds
- **Separation of concerns**: Setup logic separate from app logic
- **Retry mechanism**: Failed init containers are restarted
- **Shared volumes**: Pass data from init to main containers

---

## Day 3: Logging Sidecars

### Why Logging Sidecars?

Logging sidecars handle log collection, processing, and shipping without modifying the main application.

### Benefits

- **Log aggregation**: Collect logs from multiple sources
- **Format transformation**: Convert logs to different formats
- **Remote shipping**: Send logs to external systems
- **Buffering**: Handle log bursts without losing data
- **Filtering**: Remove sensitive information

### Hands-on Exercise

#### Step 1: Simple Log Shipper Sidecar

Create `log-shipper.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-log-shipper
spec:
  containers:
  # Main application generating logs
  - name: app
    image: busybox
    command:
    - sh
    - -c
    - |
      while true; do
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo "[$timestamp] Application log entry $RANDOM" >> /var/log/app/application.log
        sleep 2
      done
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
  
  # Log shipper sidecar
  - name: log-shipper
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Log shipper started"
      tail -F /var/log/app/application.log | while read line; do
        echo "[SHIPPED] $line"
        # In production, this would send to Elasticsearch, Loki, etc.
      done
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
      readOnly: true
    readinessProbe:
      exec:
        command: ["sh", "-c", "test -f /var/log/app/application.log || test -d /var/log/app"]
      initialDelaySeconds: 2
      periodSeconds: 5
  
  volumes:
  - name: logs
    emptyDir:
      sizeLimit: 200Mi
```

```bash
# Create the pod
kubectl apply -f log-shipper.yaml

# Watch logs being shipped
kubectl logs app-with-log-shipper -c log-shipper -f
```

#### Step 2: Fluentd Logging Sidecar

Create `fluentd-sidecar.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/nginx/*.log
      pos_file /var/log/fluentd-app.log.pos
      tag app.logs
      <parse>
        @type none
      </parse>
    </source>
    
    <filter app.logs>
      @type record_transformer
      <record>
        hostname "#{Socket.gethostname}"
        tag ${tag}
      </record>
    </filter>
    
    <match app.logs>
      @type stdout
    </match>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-fluentd
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fluentd-demo
  template:
    metadata:
      labels:
        app: fluentd-demo
    spec:
      containers:
      # Main application
      - name: web-app
        image: nginx
        volumeMounts:
        - name: logs
          mountPath: /var/log/nginx
        - name: nginx-file-logs
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
      
      # Fluentd sidecar
      - name: fluentd
        image: fluent/fluentd:v1.16-1
        volumeMounts:
        - name: logs
          mountPath: /var/log/nginx
          readOnly: true
        - name: fluentd-config
          mountPath: /fluentd/etc/fluent.conf
          subPath: fluent.conf
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
            ephemeral-storage: "100Mi"
          limits:
            memory: "256Mi"
            cpu: "500m"
            ephemeral-storage: "300Mi"
      
      volumes:
      - name: logs
        emptyDir:
          sizeLimit: 200Mi
      - name: fluentd-config
        configMap:
          name: fluentd-config
      - name: nginx-file-logs
        configMap:
          name: nginx-file-logs
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-file-logs
data:
  nginx.conf: |
    user  nginx;
    worker_processes  1;
    error_log  /var/log/nginx/error.log warn;
    pid        /var/run/nginx.pid;
    events { worker_connections 1024; }
    http {
      include       /etc/nginx/mime.types;
      default_type  application/octet-stream;
      access_log    /var/log/nginx/access.log  main;
      sendfile        on;
      keepalive_timeout  65;
      server {
        listen 80;
        location / {
          return 200 "ok\n";
        }
      }
      log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';
    }
```

```bash
# Deploy with Fluentd sidecar
kubectl apply -f fluentd-sidecar.yaml

# Generate some logs
kubectl exec -it $(kubectl get pod -l app=fluentd-demo -o jsonpath='{.items[0].metadata.name}') \
  -c web-app -- sh -c 'for i in $(seq 1 10); do curl localhost; done'

# Check Fluentd processing logs
kubectl logs -l app=fluentd-demo -c fluentd
```

#### Step 3: Multi-Format Log Processor

Create `log-processor-sidecar.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-format-logger
spec:
  containers:
  # App generating JSON logs
  - name: json-app
    image: busybox
    command:
    - sh
    - -c
    - |
      while true; do
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"level\":\"INFO\",\"message\":\"Application event\",\"request_id\":\"$RANDOM\"}" >> /logs/app.json
        sleep 3
      done
    volumeMounts:
    - name: logs
      mountPath: /logs
  
  # Sidecar converting JSON to plain text
  - name: log-formatter
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Log formatter started"
      tail -F /logs/app.json | while read line; do
        # Simple JSON parsing in shell (for demo purposes)
        timestamp=$(echo "$line" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
        level=$(echo "$line" | grep -o '"level":"[^"]*"' | cut -d'"' -f4)
        message=$(echo "$line" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        echo "[$timestamp] $level - $message" >> /logs/formatted.log
      done
    volumeMounts:
    - name: logs
      mountPath: /logs
  
  # Sidecar for monitoring formatted logs
  - name: log-monitor
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Waiting for formatted logs..."
      sleep 5
      tail -F /logs/formatted.log
    volumeMounts:
    - name: logs
      mountPath: /logs
      readOnly: true
  
  volumes:
  - name: logs
    emptyDir: {}
```

```bash
# Create the pod
kubectl apply -f log-processor-sidecar.yaml

# Watch the formatted output
kubectl logs multi-format-logger -c log-monitor -f

# Check raw JSON logs
kubectl logs multi-format-logger -c json-app
```

#### Step 4: Log Filtering Sidecar (Remove Sensitive Data)

Create `log-filter-sidecar.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: log-filter-demo
spec:
  containers:
  # App that logs sensitive data
  - name: app
    image: busybox
    command:
    - sh
    - -c
    - |
      while true; do
        echo "User login: username=admin password=secret123 ip=192.168.1.100" >> /logs/app.log
        echo "API call: endpoint=/api/users token=abc123xyz456" >> /logs/app.log
        echo "Normal log: Processing request for user admin" >> /logs/app.log
        sleep 5
      done
    volumeMounts:
    - name: logs
      mountPath: /logs
  
  # Sidecar filters sensitive data
  - name: log-filter
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Log filter started - removing sensitive data"
      tail -F /logs/app.log | while read line; do
        # Redact passwords
        filtered=$(echo "$line" | sed 's/password=[^ ]*/password=***REDACTED***/g')
        # Redact tokens
        filtered=$(echo "$filtered" | sed 's/token=[^ ]*/token=***REDACTED***/g')
        echo "[FILTERED] $filtered"
      done
    volumeMounts:
    - name: logs
      mountPath: /logs
      readOnly: true
  
  volumes:
  - name: logs
    emptyDir: {}
```

```bash
# Create the pod
kubectl apply -f log-filter-sidecar.yaml

# Compare raw vs filtered logs
echo "=== RAW LOGS (with sensitive data) ==="
kubectl logs log-filter-demo -c app | tail -5

echo ""
echo "=== FILTERED LOGS (sensitive data removed) ==="
kubectl logs log-filter-demo -c log-filter | tail -5
```

### Key Concepts Learned

- **Log collection**: Sidecars can tail and ship logs
- **Format transformation**: Convert between log formats
- **Sensitive data filtering**: Remove passwords, tokens, PII
- **Separation of concerns**: App doesn't need to know about log shipping
- **Resource isolation**: Log processing doesn't affect app performance

#### Note on ephemeral storage and evictions

Log-heavy pods can be evicted when ephemeral storage fills up. To mitigate:
- Set `resources.requests/limits.ephemeral-storage` on log/metrics sidecars
- Use `emptyDir.sizeLimit` on shared log volumes
- Monitor `Evicted` pod events and `ephemeral-storage` usage

---

## Day 4: Service Mesh Sidecars

### What is a Service Mesh Sidecar?

Service mesh sidecars (like Envoy, Linkerd) handle:
- **Traffic management**: Routing, retries, timeouts
- **Security**: mTLS, authentication, authorization
- **Observability**: Metrics, traces, logs
- **Resilience**: Circuit breaking, rate limiting

### Common Service Mesh Implementations

| Service Mesh | Sidecar Proxy | Key Features |
|--------------|---------------|--------------|
| **Istio** | Envoy | Full-featured, complex |
| **Linkerd** | linkerd2-proxy | Lightweight, simple |
| **Consul Connect** | Envoy | HashiCorp integration |
| **AWS App Mesh** | Envoy | AWS-native |

### Hands-on Exercise

#### Step 1: Manual Sidecar Proxy Pattern

Create `nginx-proxy-sidecar.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-proxy-config
data:
  nginx.conf: |
    events {
        worker_connections 1024;
    }
    
    http {
        upstream backend {
            server 127.0.0.1:8080;
        }
        
        server {
            listen 80;
            
            location / {
                proxy_pass http://backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                
                # Add observability headers
                add_header X-Proxy-Cache $upstream_cache_status;
                add_header X-Upstream-Response-Time $upstream_response_time;
            }
            
            location /health {
                access_log off;
                return 200 "healthy\n";
                add_header Content-Type text/plain;
            }
        }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-proxy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: proxy-demo
  template:
    metadata:
      labels:
        app: proxy-demo
    spec:
      containers:
      # Main application
      - name: app
        image: hashicorp/http-echo
        args:
        - "-text=Hello from the app!"
        - "-listen=:8080"
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "32Mi"
            cpu: "50m"
      
      # Nginx proxy sidecar
      - name: nginx-proxy
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
      
      volumes:
      - name: nginx-config
        configMap:
          name: nginx-proxy-config
---
apiVersion: v1
kind: Service
metadata:
  name: proxy-demo-service
spec:
  selector:
    app: proxy-demo
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

```bash
# Deploy the app with proxy sidecar
kubectl apply -f nginx-proxy-sidecar.yaml

# Wait for deployment
kubectl wait --for=condition=available deployment/app-with-proxy --timeout=60s

# Test the service
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -v http://proxy-demo-service

# Check for proxy headers
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -I http://proxy-demo-service

# Check health endpoint
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl http://proxy-demo-service/health
```

#### Step 2: mTLS Sidecar (Mutual TLS)

Create `mtls-sidecar.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mtls-config
data:
  start-proxy.sh: |
    #!/bin/sh
    echo "Starting mTLS proxy sidecar..."
    echo "In production, this would:"
    echo "- Generate/fetch certificates"
    echo "- Configure TLS termination"
    echo "- Handle certificate rotation"
    echo "- Verify client certificates"
    echo ""
    echo "Proxy ready and forwarding secure traffic to localhost:8080"
    
    # Simulate proxy behavior
    while true; do
      sleep 10
      echo "mTLS proxy: $(date) - Secured connections: $RANDOM"
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      containers:
      # Application (unaware of TLS)
      - name: app
        image: hashicorp/http-echo
        args:
        - "-text=Secure application"
        - "-listen=:8080"
        ports:
        - containerPort: 8080
      
      # mTLS proxy sidecar
      - name: mtls-proxy
        image: busybox
        command: ["/bin/sh", "/config/start-proxy.sh"]
        ports:
        - containerPort: 443
          name: https
        volumeMounts:
        - name: config
          mountPath: /config
      
      volumes:
      - name: config
        configMap:
          name: mtls-config
          defaultMode: 0755
```

```bash
# Deploy secure app
kubectl apply -f mtls-sidecar.yaml

# Check mTLS proxy logs
kubectl logs -l app=secure-app -c mtls-proxy -f
```

#### Step 3: Traffic Management Sidecar

Create `traffic-management-sidecar.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traffic-manager-config
data:
  traffic-manager.sh: |
    #!/bin/sh
    echo "Traffic Management Sidecar Started"
    echo "Features:"
    echo "- Retries with exponential backoff"
    echo "- Circuit breaking"
    echo "- Timeout management"
    echo "- Request routing"
    echo ""
    
    while true; do
      sleep 15
      echo "[$(date)] Traffic stats:"
      echo "  - Requests: $((RANDOM % 1000))"
      echo "  - Retries: $((RANDOM % 10))"
      echo "  - Circuit breaker: CLOSED"
      echo "  - Avg latency: $((RANDOM % 100))ms"
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resilient-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: resilient-app
  template:
    metadata:
      labels:
        app: resilient-app
    spec:
      containers:
      # Application
      - name: app
        image: hashicorp/http-echo
        args: ["-text=Resilient app", "-listen=:8080"]
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      
      # Traffic management sidecar
      - name: traffic-manager
        image: busybox
        command: ["/bin/sh", "/scripts/traffic-manager.sh"]
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      
      volumes:
      - name: scripts
        configMap:
          name: traffic-manager-config
          defaultMode: 0755
```

```bash
# Deploy resilient app
kubectl apply -f traffic-management-sidecar.yaml

# Watch traffic management metrics
kubectl logs -l app=resilient-app -c traffic-manager -f
```

#### Step 4: Metrics Collection Sidecar (Prometheus)

Create `metrics-sidecar.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    
    scrape_configs:
    - job_name: 'app-metrics'
      metrics_path: /metrics
      static_configs:
      - targets: ['localhost:9102']
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-metrics
spec:
  replicas: 1
  selector:
    matchLabels:
      app: metrics-demo
  template:
    metadata:
      labels:
        app: metrics-demo
    spec:
      containers:
      # Application exposing metrics
      - name: app
        image: hashicorp/http-echo
        args: ["-text=App with metrics", "-listen=:8080"]
        ports:
        - containerPort: 8080
          name: http
      
      # Demo metrics exporter sidecar (serves /metrics on :9102)
      - name: demo-metrics
        image: busybox
        command:
        - sh
        - -c
        - |
          mkdir -p /www
          httpd -f -p 9102 -h /www &
          while true; do
            cat > /www/metrics <<'EOF'
  # HELP demo_requests_total Total number of demo requests
  # TYPE demo_requests_total counter
  demo_requests_total 321
  # HELP demo_latency_ms Demo latency in ms
  # TYPE demo_latency_ms gauge
  demo_latency_ms 42
  EOF
            sleep 10
          done
        ports:
        - containerPort: 9102
          name: demo-metrics
        readinessProbe:
          httpGet:
            path: /metrics
            port: 9102
          initialDelaySeconds: 3
          periodSeconds: 5
      
      # Prometheus sidecar scraping metrics
      - name: prometheus
        image: prom/prometheus:latest
        args:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--web.console.libraries=/usr/share/prometheus/console_libraries'
        - '--web.console.templates=/usr/share/prometheus/consoles'
        ports:
        - containerPort: 9090
          name: prometheus
        volumeMounts:
        - name: prometheus-config
          mountPath: /etc/prometheus
        - name: prometheus-storage
          mountPath: /prometheus
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      
      volumes:
      - name: prometheus-config
        configMap:
          name: prometheus-config
      - name: prometheus-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: metrics-demo-prometheus
spec:
  selector:
    app: metrics-demo
  ports:
  - port: 9090
    targetPort: 9090
    name: prometheus
```

```bash
# Deploy app with metrics
kubectl apply -f metrics-sidecar.yaml

# Wait for pods
kubectl wait --for=condition=ready pod -l app=metrics-demo --timeout=60s

# Access Prometheus (in another terminal)
kubectl port-forward svc/metrics-demo-prometheus 9090:9090

# Open browser to http://localhost:9090
# Query: up
# This shows which targets are being scraped
```

### Key Concepts Learned

- **Traffic proxying**: Sidecars intercept and manage traffic
- **Security**: mTLS without app changes
- **Observability**: Metrics, traces, logs at proxy level
- **Resilience**: Retries, circuit breaking, timeouts
- **Transparency**: App doesn't need to know about the proxy

---

## Day 5: Ambassador & Adapter Patterns

### Ambassador Pattern

**Ambassador** acts as a proxy between the application and external services. It:
- Simplifies connectivity
- Handles retries and timeouts
- Manages connection pooling
- Provides local caching

### Adapter Pattern

**Adapter** standardizes interfaces and output formats. It:
- Normalizes monitoring data
- Converts log formats
- Translates protocols
- Standardizes metrics

### Hands-on Exercise

#### Step 1: Ambassador Pattern - Database Proxy

Create `db-ambassador.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-proxy-config
data:
  proxy.sh: |
    #!/bin/sh
    echo "Database Ambassador Proxy Started"
    echo "Connecting to: ${DB_HOST}:${DB_PORT}"
    echo ""
    echo "Features:"
    echo "- Connection pooling"
    echo "- Automatic retry on connection failure"
    echo "- Query timeout management"
    echo "- Connection health monitoring"
    echo ""
    
    while true; do
      sleep 20
      echo "[$(date)] DB proxy stats:"
      echo "  - Active connections: $((RANDOM % 20))"
      echo "  - Pool size: 10"
      echo "  - Queries/sec: $((RANDOM % 1000))"
      echo "  - Avg latency: $((RANDOM % 50))ms"
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-db-ambassador
spec:
  replicas: 2
  selector:
    matchLabels:
      app: db-ambassador-demo
  template:
    metadata:
      labels:
        app: db-ambassador-demo
    spec:
      containers:
      # Main application
      - name: app
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Application started"
          echo "Connecting to database via localhost:3306 (ambassador)"
          while true; do
            echo "[$(date)] Executing query via ambassador..."
            sleep 30
          done
        env:
        - name: DB_HOST
          value: "localhost"
        - name: DB_PORT
          value: "3306"
      
      # Database ambassador sidecar
      - name: db-ambassador
        image: busybox
        command: ["/bin/sh", "/config/proxy.sh"]
        env:
        - name: DB_HOST
          value: "mariadb.default.svc.cluster.local"
        - name: DB_PORT
          value: "3306"
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: config
          mountPath: /config
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
      
      volumes:
      - name: config
        configMap:
          name: db-proxy-config
          defaultMode: 0755
```

```bash
# Deploy ambassador pattern
kubectl apply -f db-ambassador.yaml

# Check app logs
kubectl logs -l app=db-ambassador-demo -c app -f

# Check ambassador logs in another terminal
kubectl logs -l app=db-ambassador-demo -c db-ambassador -f
```

#### Step 2: Ambassador Pattern - Redis Cache Proxy

Create `redis-ambassador.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-proxy-config
data:
  redis-proxy.sh: |
    #!/bin/sh
    echo "Redis Ambassador Started"
    echo "Proxying to: ${REDIS_HOST}:${REDIS_PORT}"
    echo ""
    echo "Features:"
    echo "- Connection retry with backoff"
    echo "- Local caching layer"
    echo "- Automatic failover"
    echo "- Metrics collection"
    echo ""
    
    while true; do
      sleep 10
      echo "[$(date)] Cache stats:"
      echo "  - Cache hits: $((RANDOM % 1000))"
      echo "  - Cache misses: $((RANDOM % 100))"
      echo "  - Hit rate: $((RANDOM % 30 + 70))%"
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-redis-ambassador
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-ambassador-demo
  template:
    metadata:
      labels:
        app: redis-ambassador-demo
    spec:
      containers:
      # Application
      - name: app
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "App connecting to Redis via ambassador at localhost:6379"
          while true; do
            echo "[$(date)] GET user:$((RANDOM % 1000))"
            sleep 5
          done
      
      # Redis ambassador
      - name: redis-ambassador
        image: busybox
        command: ["/bin/sh", "/config/redis-proxy.sh"]
        env:
        - name: REDIS_HOST
          value: "redis-service"
        - name: REDIS_PORT
          value: "6379"
        volumeMounts:
        - name: config
          mountPath: /config
      
      volumes:
      - name: config
        configMap:
          name: redis-proxy-config
          defaultMode: 0755
```

```bash
# Deploy Redis ambassador
kubectl apply -f redis-ambassador.yaml

# Watch cache statistics
kubectl logs -l app=redis-ambassador-demo -c redis-ambassador -f
```

#### Step 3: Adapter Pattern - Metrics Adapter

Create `metrics-adapter.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metrics-adapter-config
data:
  adapter.sh: |
    #!/bin/sh
    echo "Metrics Adapter Started"
    echo "Serving Prometheus metrics on :9090/metrics"
    mkdir -p /www
    httpd -f -p 9090 -h /www &
    
    while true; do
      # Simulate reading custom app metrics
      requests=$((RANDOM % 10000))
      errors=$((RANDOM % 100))
      latency=$((RANDOM % 500))
      
      # Write Prometheus exposition to /metrics
      cat > /www/metrics <<EOF
    # HELP app_requests_total Total number of requests
    # TYPE app_requests_total counter
    app_requests_total $requests
    
    # HELP app_errors_total Total number of errors
    # TYPE app_errors_total counter
    app_errors_total $errors
    
    # HELP app_latency_milliseconds Request latency
    # TYPE app_latency_milliseconds gauge
    app_latency_milliseconds $latency
    EOF
      sleep 15
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-metrics-adapter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: metrics-adapter-demo
  template:
    metadata:
      labels:
        app: metrics-adapter-demo
    spec:
      containers:
      # Application with custom metrics format
      - name: app
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "App generating custom metrics"
          while true; do
            echo "CUSTOM_FORMAT: requests=$((RANDOM % 1000)), errors=$((RANDOM % 10))" > /metrics/app-metrics.txt
            sleep 10
          done
        volumeMounts:
        - name: metrics
          mountPath: /metrics
      
      # Metrics adapter (converts to Prometheus format)
      - name: metrics-adapter
        image: busybox
        command: ["/bin/sh", "/config/adapter.sh"]
        volumeMounts:
        - name: metrics
          mountPath: /metrics
          readOnly: true
        - name: config
          mountPath: /config
        ports:
        - containerPort: 9090
          name: metrics
        readinessProbe:
          httpGet:
            path: /metrics
            port: 9090
          initialDelaySeconds: 3
          periodSeconds: 5
      
      volumes:
      - name: metrics
        emptyDir: {}
      - name: config
        configMap:
          name: metrics-adapter-config
          defaultMode: 0755
```

```bash
# Deploy metrics adapter
kubectl apply -f metrics-adapter.yaml

# Watch metrics conversion
kubectl logs -l app=metrics-adapter-demo -c metrics-adapter -f
```

#### Step 4: Adapter Pattern - Log Format Converter

Create `log-adapter.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: log-adapter-demo
spec:
  containers:
  # App generates logs in custom format
  - name: app
    image: busybox
    command:
    - sh
    - -c
    - |
      while true; do
        # Custom log format
        echo "TIMESTAMP=$(date +%s)|LEVEL=INFO|MODULE=auth|USER=$((RANDOM % 100))|ACTION=login" >> /logs/app.log
        sleep 3
      done
    volumeMounts:
    - name: logs
      mountPath: /logs
  
  # Adapter converts to JSON format
  - name: log-adapter
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Log Adapter: Converting custom format to JSON"
      tail -F /logs/app.log | while read line; do
        # Parse custom format
        timestamp=$(echo "$line" | grep -o 'TIMESTAMP=[^|]*' | cut -d= -f2)
        level=$(echo "$line" | grep -o 'LEVEL=[^|]*' | cut -d= -f2)
        module=$(echo "$line" | grep -o 'MODULE=[^|]*' | cut -d= -f2)
        user=$(echo "$line" | grep -o 'USER=[^|]*' | cut -d= -f2)
        action=$(echo "$line" | grep -o 'ACTION=[^|]*' | cut -d= -f2)
        
        # Output as JSON
        echo "{\"timestamp\":$timestamp,\"level\":\"$level\",\"module\":\"$module\",\"user\":$user,\"action\":\"$action\"}"
      done
    volumeMounts:
    - name: logs
      mountPath: /logs
      readOnly: true
  
  volumes:
  - name: logs
    emptyDir: {}
```

```bash
# Create log adapter demo
kubectl apply -f log-adapter.yaml

# Compare formats
echo "=== Original custom format ==="
kubectl logs log-adapter-demo -c app | tail -5

echo ""
echo "=== Adapted JSON format ==="
kubectl logs log-adapter-demo -c log-adapter | tail -5
```

### Key Concepts Learned

- **Ambassador**: Simplifies external connectivity
- **Adapter**: Normalizes interfaces and formats
- **Decoupling**: App doesn't depend on external format
- **Reusability**: Adapters/ambassadors are reusable
- **Flexibility**: Easy to change backends without app changes

---

## Day 6: Monitoring & Observability Sidecars

### The Three Pillars of Observability

1. **Metrics**: Numerical measurements over time
2. **Logs**: Discrete events
3. **Traces**: Request flow through systems

### Why Observability Sidecars?

- **Automatic instrumentation**: No code changes needed
- **Standardization**: Consistent observability across services
- **Resource isolation**: Monitoring doesn't impact app
- **Technology agnostic**: Works with any app

### Hands-on Exercise

#### Step 1: Complete Observability Stack

Create `observability-sidecar.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: observability-config
data:
  metrics-exporter.sh: |
    #!/bin/sh
    echo "Metrics Exporter Started"
    while true; do
      timestamp=$(date -u +%s)
      requests=$((RANDOM % 1000))
      echo "app_http_requests_total{method=\"GET\",status=\"200\"} $requests $timestamp"
      echo "app_http_requests_total{method=\"POST\",status=\"201\"} $((RANDOM % 100)) $timestamp"
      echo "app_http_request_duration_seconds_sum $((RANDOM % 10000)) $timestamp"
      sleep 10
    done
  
  trace-collector.sh: |
    #!/bin/sh
    echo "Trace Collector Started"
    echo "Collecting distributed traces..."
    while true; do
      trace_id=$(printf '%016x' $((RANDOM)))
      span_id=$(printf '%08x' $((RANDOM)))
      duration=$((RANDOM % 500))
      echo "[TRACE] trace_id=$trace_id span_id=$span_id duration=${duration}ms service=app"
      sleep 8
    done
  
  log-aggregator.sh: |
    #!/bin/sh
    echo "Log Aggregator Started"
    echo "Collecting and enriching logs..."
    tail -F /var/log/app/app.log 2>/dev/null | while read line; do
      pod_name=$(hostname)
      timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
      echo "{\"timestamp\":\"$timestamp\",\"pod\":\"$pod_name\",\"log\":\"$line\"}"
    done &
    
    while true; do
      sleep 5
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fully-observable-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: observable-demo
  template:
    metadata:
      labels:
        app: observable-demo
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      # Main application
      - name: app
        image: hashicorp/http-echo
        args:
        - "-text=Observable Application"
        - "-listen=:8080"
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
      
      # Metrics exporter sidecar
      - name: metrics-exporter
        image: busybox
        command:
        - sh
        - -c
        - |
          mkdir -p /www
          # Start a simple HTTP server to expose /metrics
          httpd -f -p 9090 -h /www &
          while true; do
            cat > /www/metrics <<'EOF'
  # HELP app_http_requests_total Total number of requests
  # TYPE app_http_requests_total counter
  app_http_requests_total{method="GET",status="200"} 123
  app_http_requests_total{method="POST",status="201"} 45
  # HELP app_http_request_duration_seconds_sum Sum of request durations
  # TYPE app_http_request_duration_seconds_sum counter
  app_http_request_duration_seconds_sum 9876
  EOF
            sleep 10
          done
        ports:
        - containerPort: 9090
          name: metrics
        readinessProbe:
          httpGet:
            path: /metrics
            port: 9090
          initialDelaySeconds: 3
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /config
        resources:
          requests:
            memory: "32Mi"
            cpu: "50m"
      
      # Trace collector sidecar
      - name: trace-collector
        image: busybox
        command: ["/bin/sh", "/config/trace-collector.sh"]
        volumeMounts:
        - name: config
          mountPath: /config
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
      
      # Log aggregator sidecar
      - name: log-aggregator
        image: busybox
        command: ["/bin/sh", "/config/log-aggregator.sh"]
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
          readOnly: true
        - name: config
          mountPath: /config
        resources:
          requests:
            memory: "32Mi"
            cpu: "50m"
      
      volumes:
      - name: logs
        emptyDir: {}
      - name: config
        configMap:
          name: observability-config
          defaultMode: 0755
```

```bash
# Deploy fully observable app
kubectl apply -f observability-sidecar.yaml

# Watch metrics
kubectl logs -l app=observable-demo -c metrics-exporter -f

# Watch traces (in another terminal)
kubectl logs -l app=observable-demo -c trace-collector -f

# Watch logs (in another terminal)
kubectl logs -l app=observable-demo -c log-aggregator -f
```

#### Step 2: Application Performance Monitoring (APM) Sidecar

Create `apm-sidecar.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: apm-config
data:
  apm-agent.sh: |
    #!/bin/sh
    echo "APM Agent Started"
    echo "Monitoring application performance..."
    echo ""
    
    while true; do
      # Simulate APM metrics collection
      cpu_usage=$((RANDOM % 100))
      memory_mb=$((RANDOM % 512))
      response_time=$((RANDOM % 1000))
      error_rate=$((RANDOM % 5))
      
      echo "=== APM Snapshot $(date) ==="
      echo "CPU Usage: ${cpu_usage}%"
      echo "Memory: ${memory_mb}MB"
      echo "Avg Response Time: ${response_time}ms"
      echo "Error Rate: ${error_rate}%"
      
      # Alert if metrics exceed thresholds
      if [ $response_time -gt 800 ]; then
        echo "⚠️  ALERT: High response time detected!"
      fi
      
      if [ $error_rate -gt 3 ]; then
        echo "⚠️  ALERT: High error rate detected!"
      fi
      
      echo ""
      sleep 15
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-apm
spec:
  replicas: 2
  selector:
    matchLabels:
      app: apm-demo
  template:
    metadata:
      labels:
        app: apm-demo
    spec:
      containers:
      # Application
      - name: app
        image: hashicorp/http-echo
        args: ["-text=App with APM", "-listen=:8080"]
        ports:
        - containerPort: 8080
      
      # APM agent sidecar
      - name: apm-agent
        image: busybox
        command: ["/bin/sh", "/config/apm-agent.sh"]
        volumeMounts:
        - name: config
          mountPath: /config
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
      
      volumes:
      - name: config
        configMap:
          name: apm-config
          defaultMode: 0755
```

```bash
# Deploy APM monitoring
kubectl apply -f apm-sidecar.yaml

# Watch APM metrics and alerts
kubectl logs -l app=apm-demo -c apm-agent -f
```

#### Step 3: Distributed Tracing Sidecar (Jaeger-like)

Create `tracing-sidecar.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jaeger-config
data:
  jaeger-agent.sh: |
    #!/bin/sh
    echo "Jaeger Agent Sidecar Started"
    echo "Collecting traces and spans..."
    echo ""
    
    services=("frontend" "auth-service" "user-service" "database")
    operations=("GET /api/users" "POST /api/login" "GET /api/orders" "query:SELECT")
    
    while true; do
      # Generate trace
      trace_id=$(printf '%032x' $((RANDOM * RANDOM)))
      parent_span_id="0000000000000000"
      
      echo "=== New Trace: $trace_id ==="
      
      # Generate spans for the trace
      for i in $(seq 0 3); do
        service=${services[$i]}
        operation=${operations[$i]}
        span_id=$(printf '%016x' $((RANDOM)))
        duration=$((RANDOM % 200 + 10))
        
        echo "Span:"
        echo "  Service: $service"
        echo "  Operation: $operation"
        echo "  SpanID: $span_id"
        echo "  ParentSpanID: $parent_span_id"
        echo "  Duration: ${duration}ms"
        echo ""
        
        parent_span_id=$span_id
        sleep 1
      done
      
      echo "Trace completed"
      echo ""
      sleep 20
    done
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-tracing
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tracing-demo
  template:
    metadata:
      labels:
        app: tracing-demo
    spec:
      containers:
      # Application
      - name: app
        image: hashicorp/http-echo
        args: ["-text=Traced application", "-listen=:8080"]
        ports:
        - containerPort: 8080
      
      # Jaeger agent sidecar
      - name: jaeger-agent
        image: busybox
        command: ["/bin/sh", "/config/jaeger-agent.sh"]
        ports:
        - containerPort: 6831
          name: jaeger-thrift
          protocol: UDP
        volumeMounts:
        - name: config
          mountPath: /config
      
      volumes:
      - name: config
        configMap:
          name: jaeger-config
          defaultMode: 0755
```

```bash
# Deploy distributed tracing
kubectl apply -f tracing-sidecar.yaml

# Watch distributed traces
kubectl logs -l app=tracing-demo -c jaeger-agent -f
```

#### Step 4: Resource Monitoring Sidecar

Create `resource-monitor-sidecar.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-monitor-demo
spec:
  containers:
  # Application that consumes resources
  - name: app
    image: polinux/stress
    command: ["stress"]
    args: ["--cpu", "1", "--vm", "1", "--vm-bytes", "128M"]
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
  
  # Resource monitoring sidecar
  - name: resource-monitor
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Resource Monitor Started"
      echo "Monitoring container resource usage..."
      echo ""
      
      while true; do
        # In a real scenario, would read from /sys/fs/cgroup
        echo "=== Resource Usage $(date) ==="
        
        # Simulated metrics
        cpu_usage=$((RANDOM % 60 + 20))
        memory_mb=$((RANDOM % 256 + 128))
        memory_percent=$((memory_mb * 100 / 512))
        
        echo "CPU Usage: ${cpu_usage}%"
        echo "Memory: ${memory_mb}MB / 512MB (${memory_percent}%)"
        
        # Resource pressure alerts
        if [ $cpu_usage -gt 80 ]; then
          echo "⚠️  CPU PRESSURE: ${cpu_usage}%"
        fi
        
        if [ $memory_percent -gt 80 ]; then
          echo "⚠️  MEMORY PRESSURE: ${memory_percent}%"
        fi
        
        echo ""
        sleep 10
      done
```

```bash
# Create resource monitoring demo
kubectl apply -f resource-monitor-sidecar.yaml

# Watch resource monitoring
kubectl logs resource-monitor-demo -c resource-monitor -f

# Compare with kubectl top (if metrics-server is installed)
kubectl top pod resource-monitor-demo --containers
```

### Key Concepts Learned

- **Multi-faceted monitoring**: Metrics, logs, and traces together
- **Automatic instrumentation**: No app code changes
- **Performance isolation**: Monitoring in separate container
- **Alerting**: Sidecars can detect and alert on issues
- **Distributed tracing**: Track requests across services

---

## Day 7: Advanced Patterns & Best Practices

### Production-Ready Patterns

Let's combine everything we've learned into production-ready configurations.

#### Pattern 1: Complete Microservice with All Sidecars

Create `production-microservice.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-microservice
  labels:
    app: prod-service
    version: v1.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: prod-service
  template:
    metadata:
      labels:
        app: prod-service
        version: v1.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      # Init containers for setup
      initContainers:
      # 1. Wait for dependencies
      - name: wait-for-db
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Waiting for dependencies..."
          echo "✓ Database ready"
          echo "✓ Cache ready"
          echo "✓ Message queue ready"
      
      # 2. Run database migrations
      - name: db-migrations
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Running database migrations..."
          echo "✓ Migration 001: Create tables"
          echo "✓ Migration 002: Add indexes"
          echo "All migrations completed"
      
      # 3. Load configuration
      - name: config-loader
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Loading configuration..."
          echo "environment=production" > /config/app.conf
          echo "log_level=info" >> /config/app.conf
          echo "✓ Configuration loaded"
        volumeMounts:
        - name: config
          mountPath: /config
      
      containers:
      # Main application
      - name: app
        image: hashicorp/http-echo
        args:
        - "-text=Production Microservice v1.0"
        - "-listen=:8080"
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        volumeMounts:
        - name: config
          mountPath: /config
        - name: logs
          mountPath: /var/log/app
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
      
      # Logging sidecar
      - name: log-shipper
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Log Shipper: Monitoring /var/log/app"
          tail -F /var/log/app/*.log 2>/dev/null | while read line; do
            echo "[SHIPPED] $line"
          done &
          
          while true; do
            sleep 30
            echo "Log shipper: Active, logs being forwarded to central system"
          done
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
          readOnly: true
        securityContext:
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
            ephemeral-storage: "100Mi"
          limits:
            memory: "128Mi"
            cpu: "100m"
            ephemeral-storage: "300Mi"
      
      # Metrics exporter sidecar
      - name: metrics-exporter
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Metrics Exporter Started"
          while true; do
            echo "# HELP app_requests_total Total requests"
            echo "# TYPE app_requests_total counter"
            echo "app_requests_total{service=\"prod-service\"} $((RANDOM % 10000))"
            sleep 15
          done
        ports:
        - containerPort: 9090
          name: metrics
        securityContext:
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
            ephemeral-storage: "100Mi"
          limits:
            memory: "128Mi"
            cpu: "100m"
            ephemeral-storage: "300Mi"
      
      # Security/compliance sidecar
      - name: security-agent
        image: busybox
        command:
        - sh
        - -c
        - |
          echo "Security Agent Started"
          while true; do
            echo "[SECURITY] Scanning for vulnerabilities..."
            echo "[SECURITY] ✓ No threats detected"
            echo "[SECURITY] Compliance check: PASSED"
            sleep 60
          done
        securityContext:
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
      
      volumes:
      - name: config
        emptyDir: {}
      - name: logs
        emptyDir:
          sizeLimit: 1Gi
      
      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      
      terminationGracePeriodSeconds: 30
      # DNS and networking
      dnsPolicy: ClusterFirst
      restartPolicy: Always
---
apiVersion: v1
kind: Service
metadata:
  name: prod-service
spec:
  selector:
    app: prod-service
  ports:
  - port: 80
    targetPort: 8080
    name: http
  - port: 9090
    targetPort: 9090
    name: metrics
  type: ClusterIP
```

```bash
# Deploy production microservice
kubectl apply -f production-microservice.yaml

# Watch all containers start
kubectl get pods -l app=prod-service --watch

# Check init container logs
POD=$(kubectl get pod -l app=prod-service -o jsonpath='{.items[0].metadata.name}')
kubectl logs $POD -c wait-for-db
kubectl logs $POD -c db-migrations
kubectl logs $POD -c config-loader

# Check running containers
kubectl logs $POD -c app
kubectl logs $POD -c log-shipper -f
kubectl logs $POD -c metrics-exporter
kubectl logs $POD -c security-agent
```

#### Pattern 2: Sidecar Injection (Manual Simulation)

Create `sidecar-injection-template.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sidecar-injection-template
data:
  inject-sidecars.sh: |
    #!/bin/bash
    # This simulates what service meshes do automatically
    # In reality, this is done via mutating admission webhooks
    
    cat <<EOF
    Sidecar Injection Template
    ==========================
    
    This template would inject the following sidecars:
    
    1. Envoy Proxy Sidecar:
       - Image: envoyproxy/envoy:v1.28
       - Ports: 15001 (inbound), 15000 (admin)
       - Resources: CPU 100m, Memory 128Mi
       - Purpose: Service mesh traffic management
    
    2. Logging Sidecar:
       - Image: fluent/fluent-bit:2.0
       - Resources: CPU 50m, Memory 64Mi
       - Purpose: Log collection and forwarding
    
    3. Metrics Sidecar:
       - Image: prom/statsd-exporter:latest
       - Port: 9102
       - Resources: CPU 50m, Memory 64Mi
       - Purpose: Metrics collection
    
    Injection controlled by annotation:
      sidecar.istio.io/inject: "true"
    EOF
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auto-injected-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auto-inject-demo
  template:
    metadata:
      labels:
        app: auto-inject-demo
      annotations:
        # In a real service mesh, this triggers automatic injection
        sidecar.istio.io/inject: "true"
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
    spec:
      containers:
      # Just the application - sidecars would be injected automatically
      - name: app
        image: hashicorp/http-echo
        args: ["-text=App with auto-injected sidecars", "-listen=:8080"]
        ports:
        - containerPort: 8080
```

```bash
# Deploy the demo
kubectl apply -f sidecar-injection-template.yaml

# In a real service mesh environment, you'd see additional containers
kubectl get pod -l app=auto-inject-demo -o jsonpath='{.items[0].spec.containers[*].name}'
```

#### Best Practices Checklist

Create `best-practices-example.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sidecar-best-practices
spec:
  replicas: 2
  selector:
    matchLabels:
      app: best-practices
  template:
    metadata:
      labels:
        app: best-practices
    spec:
      # ✓ Use init containers for sequential setup
      initContainers:
      - name: setup
        image: busybox
        command: ["sh", "-c", "echo Setup complete"]
      
      containers:
      # ✓ Main container should be first
      - name: app
        image: hashicorp/http-echo
        args: ["-text=Best Practices Demo", "-listen=:8080"]
        ports:
        - containerPort: 8080
        # ✓ Always specify resource requests and limits
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        # ✓ Include health checks
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        # ✓ Use shared volumes for data exchange
        volumeMounts:
        - name: shared-data
          mountPath: /data
      
      # ✓ Sidecar containers after main app
      - name: log-sidecar
        image: busybox
        command:
        - sh
        - -c
        - "tail -F /data/*.log 2>/dev/null || sleep infinity"
        # ✓ Sidecars should have lower resource requirements
        resources:
          requests:
            memory: "32Mi"
            cpu: "50m"
          limits:
            memory: "64Mi"
            cpu: "100m"
        # ✓ Use readonly mounts when possible
        volumeMounts:
        - name: shared-data
          mountPath: /data
          readOnly: true
      
      # ✓ Use emptyDir for temporary shared storage
      volumes:
      - name: shared-data
        emptyDir: {}
      
      # ✓ Security best practices
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      
      # ✓ Proper restart policy
      restartPolicy: Always
```

```bash
# Deploy best practices example
kubectl apply -f best-practices-example.yaml

# Verify all best practices are followed
kubectl describe deployment sidecar-best-practices
```

### Common Pitfalls to Avoid

```yaml
# ❌ BAD EXAMPLE - Don't do this
apiVersion: v1
kind: Pod
metadata:
  name: bad-sidecar-example
spec:
  containers:
  # ❌ No resource limits
  - name: app
    image: nginx
    # ❌ No health checks
  
  # ❌ Sidecar trying to do too much
  - name: god-sidecar
    image: busybox
    command:
    - sh
    - -c
    - "while true; do echo Everything; sleep 1; done"
    # ❌ No resource limits on sidecar
  
  # ❌ No shared volumes for communication
  # ❌ No security context
```

### Resource Management Best Practices

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-optimized-sidecars
spec:
  containers:
  # Main app gets more resources
  - name: app
    image: nginx
    resources:
      requests:
        memory: "256Mi"
        cpu: "500m"
      limits:
        memory: "512Mi"
        cpu: "1000m"
  
  # Logging sidecar - lightweight
  - name: log-sidecar
    image: fluent/fluent-bit
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "100m"
  
  # Metrics sidecar - lightweight
  - name: metrics-sidecar
    image: prom/statsd-exporter
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "100m"
```

### Cleanup Script

```bash
# Cleanup all demo resources
kubectl delete deployment --all
kubectl delete pod --all
kubectl delete service --all
kubectl delete configmap --all
kubectl delete namespace monitoring
```

---

## Pattern Comparison

### Multi-Container Pattern Decision Matrix

| Pattern | When to Use | Pros | Cons |
|---------|------------|------|------|
| **Sidecar** | Extend app functionality | Reusable, isolated | More containers |
| **Init** | One-time setup | Guaranteed order | Sequential (slower) |
| **Ambassador** | Simplify external connections | Transparent proxy | Extra hop |
| **Adapter** | Normalize interfaces | Decouples format | Translation overhead |

### Sidecar vs Standalone Service

| Aspect | Sidecar Container | Standalone Service |
|--------|------------------|-------------------|
| **Deployment** | With every app pod | Separate deployment |
| **Scaling** | Scales with app | Independent scaling |
| **Latency** | Localhost (fast) | Network call (slower) |
| **Resource Usage** | Per-pod overhead | Shared service |
| **Use Case** | Per-pod needs | Shared functionality |

### Init Container vs Sidecar

| Feature | Init Container | Sidecar |
|---------|---------------|---------|
| **Execution** | Before app starts | Runs with app |
| **Lifetime** | Run to completion | Runs continuously |
| **Purpose** | Setup/preparation | Support/enhance |
| **Restart** | Only on failure | With app container |
| **Examples** | Migrations, config fetch | Logging, monitoring |

---

## Troubleshooting Guide

### Common Issues

#### Issue 1: Init Container Stuck

```bash
# Check init container status
kubectl describe pod <pod-name>

# Common causes:
# - Init container failing (check logs)
# - Waiting for external dependency
# - Volume mount issues

# Check init container logs
kubectl logs <pod-name> -c <init-container-name>

# Fix: Add timeout and retry logic
```

#### Issue 2: Sidecars Not Starting

```bash
# Check all containers in pod
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].name}'

# Check why sidecar isn't starting
kubectl describe pod <pod-name>

# Common causes:
# - Image pull errors
# - Resource limits too low
# - Volume mount conflicts
# - Security context issues

# Check specific sidecar logs
kubectl logs <pod-name> -c <sidecar-name>
```

#### Issue 3: Shared Volume Issues

```bash
# Check volume mounts
kubectl describe pod <pod-name> | grep -A 10 "Mounts:"

# Common causes:
# - Volume not defined
# - Mount path conflicts
# - Permission issues (check fsGroup)

# Test volume from multiple containers
kubectl exec <pod-name> -c app -- ls -la /shared
kubectl exec <pod-name> -c sidecar -- ls -la /shared
```

#### Issue 4: Communication Between Containers

```bash
# Containers can communicate via:
# 1. Shared volumes (files)
# 2. Localhost network (ports)
# 3. Shared process namespace (signals)

# Test localhost communication
kubectl exec <pod-name> -c sidecar -- curl localhost:8080

# Check if port is listening
kubectl exec <pod-name> -c app -- netstat -ln | grep 8080
```

#### Issue 5: Resource Contention

```bash
# Check if pod is running out of resources
kubectl describe pod <pod-name> | grep -A 5 "Limits\|Requests"

# Check actual resource usage
kubectl top pod <pod-name> --containers

# Common cause: Sidecars consuming too many resources
# Fix: Reduce sidecar resource limits or requests
```

#### Issue 6: Init Container Ordering

```bash
# Init containers run in order - check which one is stuck
kubectl get pod <pod-name> -o jsonpath='{.status.initContainerStatuses[*].name}'
kubectl get pod <pod-name> -o jsonpath='{.status.initContainerStatuses[*].state}'

# Check specific init container
kubectl logs <pod-name> -c <init-container-name>

# Fix: Ensure dependencies are available, add retries
```

### Debugging Commands Reference

```bash
# View all containers in a pod
kubectl get pod <pod-name> -o jsonpath='{range .spec.containers[*]}{.name}{"\n"}{end}'

# Check init containers
kubectl get pod <pod-name> -o jsonpath='{range .spec.initContainers[*]}{.name}{"\n"}{end}'

# Get container images
kubectl get pod <pod-name> -o jsonpath='{range .spec.containers[*]}{.name}{"\t"}{.image}{"\n"}{end}'

# Check container restart counts
kubectl get pod <pod-name> -o jsonpath='{range .status.containerStatuses[*]}{.name}{"\t"}{.restartCount}{"\n"}{end}'

# View container states
kubectl get pod <pod-name> -o jsonpath='{range .status.containerStatuses[*]}{.name}{"\t"}{.state}{"\n"}{end}'

# Check volumes
kubectl get pod <pod-name> -o jsonpath='{range .spec.volumes[*]}{.name}{"\n"}{end}'

# Full pod YAML for debugging
kubectl get pod <pod-name> -o yaml > pod-debug.yaml
```

### Performance Tuning

```bash
# Monitor resource usage
kubectl top pod <pod-name> --containers

# Check if OOMKilled
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].lastState.terminated.reason}'

# Adjust resources
kubectl set resources deployment <name> -c=<container> --limits=cpu=200m,memory=512Mi
```

---

## Summary

### What You've Mastered

1. **Sidecar Pattern**: Extending applications with supporting containers
2. **Init Containers**: Sequential setup before main app starts
3. **Logging Sidecars**: Centralized log collection and processing
4. **Service Mesh**: Traffic management, security, observability
5. **Ambassador Pattern**: Simplifying external connectivity
6. **Adapter Pattern**: Normalizing interfaces and formats
7. **Observability**: Complete monitoring with sidecars
8. **Best Practices**: Production-ready multi-container patterns

### When to Use Each Pattern

```
Use Init Containers when:
✓ One-time setup needed (migrations, config)
✓ Sequential execution required
✓ Must complete before app starts

Use Sidecar Containers when:
✓ Continuous supporting functionality
✓ Log shipping, monitoring, proxying
✓ Extending app without modifying code

Use Ambassador when:
✓ Simplifying external connectivity
✓ Connection pooling needed
✓ Protocol translation required

Use Adapter when:
✓ Interface normalization needed
✓ Format conversion required
✓ Legacy system integration
```

### Quick Command Reference

```bash
# View all containers in pod
kubectl get pod <pod> -o jsonpath='{.spec.containers[*].name}'

# Logs from specific container
kubectl logs <pod> -c <container>

# Follow logs from sidecar
kubectl logs <pod> -c <sidecar> -f

# Execute in specific container
kubectl exec <pod> -c <container> -- <command>

# Debug init containers
kubectl logs <pod> -c <init-container>

# Check container states
kubectl describe pod <pod>

# Resource usage by container
kubectl top pod <pod> --containers
```

### Real-World Examples

| Use Case | Pattern | Example |
|----------|---------|---------|
| **API Gateway** | Ambassador | Nginx sidecar proxying to external APIs |
| **Log Aggregation** | Sidecar | Fluentd shipping logs to Elasticsearch |
| **Service Mesh** | Sidecar | Envoy proxy for mTLS and routing |
| **Database Migrations** | Init | Liquibase running schema updates |
| **Config Management** | Init | Fetching secrets from Vault |
| **Metrics Collection** | Sidecar | Prometheus exporter |
| **Security Scanning** | Sidecar | Vulnerability scanner |
| **Cache Warming** | Init | Pre-loading data before app starts |

### Next Steps

1. **Service Mesh Deep Dive**: Learn Istio or Linkerd
2. **Observability Stack**: Deploy Prometheus, Grafana, Jaeger
3. **GitOps**: Automate sidecar injection with Argo CD
4. **Custom Admission Controllers**: Build automatic sidecar injection
5. **eBPF**: Explore sidecar-less service mesh (Cilium)
6. **Cost Optimization**: Right-size sidecar resources
7. **Multi-tenancy**: Isolate sidecars in shared clusters

---

## Additional Resources

- [Kubernetes Multi-Container Pods](https://kubernetes.io/docs/concepts/workloads/pods/#how-pods-manage-multiple-containers)
- [Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Service Mesh Comparison](https://servicemesh.es/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [Linkerd Documentation](https://linkerd.io/docs/)
- [The Sidecar Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/sidecar)
- [Container Design Patterns](https://kubernetes.io/blog/2016/06/container-design-patterns/)

---

**Practice Tips:**
1. Start with simple sidecars (logging, monitoring)
2. Experiment with init containers for setup tasks
3. Combine patterns in real applications
4. Monitor resource usage carefully
5. Test failure scenarios (what happens if sidecar crashes?)
6. Explore service mesh implementations (Istio, Linkerd)

Remember: Sidecars are powerful but add complexity. Use them when they solve a real problem!

