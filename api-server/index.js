require('dotenv').config()
const express = require('express')
const app = express()
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
const Redis = require('ioredis')
const { Server } = require('socket.io')

const PORT = process.env.PORT || 9000

const subscriber = new Redis(process.env.REDIS_URL)
const io = new Server({ cors: '*' });

io.listen(process.env.SOCKET_PORT || 9001, () => {
    console.log(`Socket Server Running on port ${process.env.SOCKET_PORT || 9001}`)
})

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
})

const ecsClient = new ECSClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const config = {
    Cluster: process.env.ECS_CLUSTER,
    task: process.env.ECS_TASK_DEFINITION
}
app.use(express.json())

app.post('/project', async (req, res) => {
    const { gitUrl, slug } = req.body;
    const projectSlug = slug ? slug : generateSlug()


    const command = new RunTaskCommand({
        cluster: config.Cluster,
        taskDefinition: config.task,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                subnets: [process.env.ECS_SUBNET_1, process.env.ECS_SUBNET_2, process.env.ECS_SUBNET_3],
                securityGroups: [process.env.ECS_SECURITY_GROUP],
                assignPublicIp: 'ENABLED'
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: 'builder-image',
                    environment: [
                        { name: 'GIT_REPOSITORY__URL', value: gitUrl },
                        { name: 'Project_id', value: projectSlug }
                    ]
                }
            ]
        }
    })
    await ecsClient.send(command);
    return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` } })
})

async function initRedisSubscriber() {
    console.log('Subscribed to logs ............')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}
initRedisSubscriber()
app.listen(PORT, () => console.log(`API Server Running on port ${PORT}`))