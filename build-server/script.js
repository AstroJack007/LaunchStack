require('dotenv').config()
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')
const Redis = require('ioredis')


/**redis publisher */
const publisher = new Redis(process.env.REDIS_URL)


const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const Project_id = process.env.Project_id;

function publishLog(log) {
    publisher.publish(`logs:${Project_id}`, JSON.stringify({ log }))
}

async function init() {
    console.log('Executing script.js')
    publishLog('Build started.......')
    const outDirPath = path.join(__dirname, 'output')

    const p = exec(`cd ${outDirPath} && npm install && npm run build`)

    p.stdout.on('data', function (data) {
        console.log(data.toString())
        publishLog(data.toString())

    })

    p.stdout.on('error', function (data) {
        console.log('Error', data.toString())
        publishLog(`Error: ${data.toString()}`)
    })

    p.on('close', async function () {
        console.log('Build Complete')
        publishLog(`Build Complete`)
        const distFolderPath = path.join(__dirname, 'output', 'dist')
        const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

        publishLog(`Uploading files to S3`)
        for (const file of distFolderContents) {
            const filePath = path.join(distFolderPath, file)
            if (fs.lstatSync(filePath).isDirectory()) continue;

            console.log('uploading', filePath)
            publishLog(`Uploading ${file}`)

            const command = new PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: `__outputs/${Project_id}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await s3Client.send(command)
            publishLog(`Uploaded ${file}`)
            console.log('uploaded', filePath)

        }
        publishLog(`Build Complete`)
        console.log('Done...')

        // Close Redis connection and exit
        await publisher.quit()
        process.exit(0)
    })
}

init()