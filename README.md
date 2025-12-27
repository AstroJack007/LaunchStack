# LaunchStack 🚀

A Vercel-like deployment platform that automatically builds and deploys your applications to AWS S3 with live preview URLs.

## 🏗️ Architecture

```mermaid
graph LR
    A[User] -->|POST /project| B[API Server]
    B -->|Trigger Task| C[AWS ECS]
    C -->|Run Container| D[Build Server]
    D -->|Clone & Build| E[GitHub]
    D -->|Upload| F[AWS S3]
    D -->|Publish Logs| G[Redis]
    G -->|Subscribe| B
    B -->|WebSocket| A
    H[S3 Reverse Proxy] -->|Serve Files| F
    A -->|Access Site| H
```

### Components

1. **API Server** - REST API to trigger builds and manage deployments
2. **Build Server** - Docker container that clones, builds, and uploads to S3
3. **S3 Reverse Proxy** - Serves static files from S3 with custom subdomains
4. **Redis** - Pub/Sub for real-time build logs
5. **AWS ECS** - Runs build containers on-demand
6. **AWS S3** - Stores built static files

---

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **Docker** Desktop (for local testing)
- **AWS Account** with:
  - ECS cluster configured
  - ECR repository for Docker images
  - S3 bucket for deployments
  - IAM credentials with appropriate permissions
- **Redis** instance (Redis Cloud or self-hosted)
- **Git** installed

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd LaunchStack
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install api-server dependencies
cd api-server
npm install
cd ..

# Install build-server dependencies
cd build-server
npm install
cd ..

# Install s3-reverse-proxy dependencies
cd s3-reverse-proxy
npm install
cd ..
```

### 3. Configure Environment Variables

Create `.env` files in each service directory:

#### `api-server/.env`

```env
# Redis Configuration
REDIS_URL=redis://default:your-password@your-redis-host:port

# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# ECS Configuration
ECS_CLUSTER=arn:aws:ecs:region:account:cluster/your-cluster
ECS_TASK_DEFINITION=arn:aws:ecs:region:account:task-definition/your-task

# Network Configuration
ECS_SUBNET_1=subnet-xxxxx
ECS_SUBNET_2=subnet-xxxxx
ECS_SUBNET_3=subnet-xxxxx
ECS_SECURITY_GROUP=sg-xxxxx

# Server Configuration
PORT=9000
SOCKET_PORT=9001
```

#### `build-server/.env`

```env
# Redis Configuration
REDIS_URL=redis://default:your-password@your-redis-host:port

# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# S3 Configuration
S3_BUCKET=your-bucket-name
```

#### `s3-reverse-proxy/.env`

```env
# S3 Configuration
S3_BUCKET=your-bucket-name
S3_REGION=ap-south-1

# Server Configuration
PORT=8000
```

### 4. Run Locally

Start the services in separate terminal windows:

**Terminal 1 - API Server:**
```bash
cd api-server
node index.js
```

**Terminal 2 - S3 Reverse Proxy:**
```bash
cd s3-reverse-proxy
node index.js
```

---

## 🐳 Docker Deployment (Build Server)

The build server runs in AWS ECS as a Docker container.

### Build and Push Docker Image

```bash
cd build-server

# Build the image
docker build -t build-server:latest .

# Tag for ECR (replace with your ECR URL)
docker tag build-server:latest <account-id>.dkr.ecr.<region>.amazonaws.com/build-server:latest

# Login to ECR
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

# Push to ECR
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/build-server:latest
```

### Configure ECS Task Definition

Add environment variables to your ECS task definition:

```json
{
  "environment": [
    {
      "name": "REDIS_URL",
      "value": "redis://default:your-password@your-redis-host:port"
    },
    {
      "name": "AWS_REGION",
      "value": "ap-south-1"
    },
    {
      "name": "AWS_ACCESS_KEY_ID",
      "value": "your-access-key"
    },
    {
      "name": "AWS_SECRET_ACCESS_KEY",
      "value": "your-secret-key"
    },
    {
      "name": "S3_BUCKET",
      "value": "your-bucket-name"
    }
  ]
}
```

---

## 🧪 Testing

### Create a Deployment

```bash
curl http://localhost:9000/project \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"gitUrl":"https://github.com/vercel/next.js"}'
```

**Response:**
```json
{
  "status": "queued",
  "data": {
    "projectSlug": "random-word-slug",
    "url": "http://random-word-slug.localhost:8000"
  }
}
```

### Access Your Deployed Site

Visit `http://<projectSlug>.localhost:8000` in your browser.

---

## 📁 Project Structure

```
LaunchStack/
├── api-server/              # REST API & WebSocket server
│   ├── index.js            # Main server file
│   ├── .env                # Environment variables
│   └── package.json
├── build-server/            # Build & deployment service
│   ├── script.js           # Build script
│   ├── main.sh             # Docker entrypoint
│   ├── Dockerfile          # Docker configuration
│   ├── .env                # Environment variables
│   └── package.json
├── s3-reverse-proxy/        # Static file server
│   ├── index.js            # Reverse proxy server
│   ├── .env                # Environment variables
│   └── package.json
└── README.md
```

---

## 🔧 Configuration

### API Server

- **Port:** 9000 (HTTP API)
- **Socket Port:** 9001 (WebSocket for logs)
- **Endpoints:**
  - `POST /project` - Create new deployment

### Build Server

- Runs in AWS ECS Fargate
- Auto-stops after build completes
- Publishes logs to Redis

### S3 Reverse Proxy

- **Port:** 8000
- Serves static files from S3
- Subdomain-based routing

---

## 🛠️ Development

### Environment Variables Testing

Test if environment variables are loaded correctly:

```bash
# API Server
cd api-server
node test-env.js

# Build Server
cd build-server
node test-env.js

# S3 Reverse Proxy
cd s3-reverse-proxy
node test-env.js
```

### Rebuild Docker After Code Changes

Whenever you modify `build-server/script.js`, you must rebuild and push:

```bash
cd build-server
docker build -t build-server:latest .
docker tag build-server:latest <ECR-URL>:latest
docker push <ECR-URL>:latest
```

---

## 📊 Monitoring

### View Build Logs

**Via WebSocket:**
Connect to `ws://localhost:9001` and subscribe to `logs:<projectSlug>`

**Via CloudWatch:**
```bash
aws logs tail /ecs/ --follow --region <region>
```

### Check ECS Tasks

```bash
# List running tasks
aws ecs list-tasks --cluster <cluster-name> --region <region>

# Describe specific task
aws ecs describe-tasks --cluster <cluster-name> --tasks <task-id> --region <region>
```

---

## 🐛 Troubleshooting

### Issue: Environment variables not loading

**Solution:**
1. Verify `.env` files exist in each service directory
2. Check file encoding (should be UTF-8)
3. Run `node test-env.js` to verify

### Issue: ECS task keeps running after build

**Solution:**
Ensure `script.js` includes process exit:
```javascript
await publisher.quit()
process.exit(0)
```

### Issue: Cannot connect to Redis

**Solution:**
1. Verify `REDIS_URL` is correct
2. Check firewall/security groups
3. Test connection: `redis-cli -u <REDIS_URL>`

### Issue: S3 uploads failing

**Solution:**
1. Verify AWS credentials
2. Check S3 bucket permissions
3. Ensure bucket name matches `.env` configuration

### Issue: Docker push fails

**Solution:**
1. Login to ECR: `aws ecr get-login-password ...`
2. Verify ECR repository exists
3. Check AWS credentials

---

## 🔐 Security

> [!WARNING]
> **Never commit `.env` files to version control!**

- `.env` files are in `.gitignore`
- Use AWS Secrets Manager for production
- Rotate credentials regularly
- Use IAM roles instead of access keys when possible

---

## 📚 Additional Resources

- **Environment Variables:** See `ENV_CONFIGURATION.md`
- **Quick Commands:** See `QUICK_COMMANDS.md`

---

## 📝 License

MIT License

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 💡 Future Enhancements

- [ ] Support for multiple deployment regions
- [ ] Custom domain support
- [ ] Build caching
- [ ] Automatic SSL certificates
- [ ] Database integration
- [ ] Environment variable management UI
- [ ] Build history and rollbacks


---

**Built with ❤️ using Node.js, Docker, AWS ECS, and Redis**
