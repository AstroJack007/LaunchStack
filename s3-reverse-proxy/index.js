
require('dotenv').config()
const express = require('express')
const app = express()
const httpProxy = require('http-proxy')
const PORT = process.env.PORT || 8000;
/**base path for s3 bucket */
const BASE_PATH = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/__outputs`

const proxy = httpProxy.createProxy()

app.use((req, res) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];


    const resolvesTo = `${BASE_PATH}/${subdomain}`

    if (req.url === '/') {
        req.url = '/index.html'
    }

    return proxy.web(req, res, { target: resolvesTo, changeOrigin: true })
})


app.listen(PORT, () => console.log(`Reverse Proxy Running on port ${PORT}`))
