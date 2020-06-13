const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const router = express.Router()
const auth = require("../middleware/auth")
const User = require('../models/user')

router.post("/users", async (req, res) => {
    const user = new User(req.body)

    try{
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({user, token})
    }catch(error){
        res.status(400).send(error)
    }
})

router.post("/users/login", async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({user, token})
    } catch (error) {
        res.status(400).send()
    }
})

router.get("/users/me", auth, async (req, res) => {
    res.send(req.user)
})

router.post("/users/logout", auth, async (req, res) => {
    try{
        req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token)

        await req.user.save()
        res.send()
    }catch(error){
        res.status(500).send()
    }
})

router.post("/users/logoutAll", auth, async (req, res) => {
    try{
        req.user.tokens = []

        await req.user.save()
        res.send()
    }catch(error){
        res.status(500).send()
    }
})

router.patch("/users/me", auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if(!isValidOperation) {
        res.status(400).send({ error: "Invalid updates"})
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.send(req.user)
    } catch (error) {
        res.status(400).send(error)
    }
})

router.delete("/users/me", auth, async (req, res) => {
    try{
        await req.user.remove()
        res.send(req.user)
    }catch(error){
        res.status(500).send()
    }
})

const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, callback){
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return callback(new Error("Please upload an image"))
        }

        callback(undefined, true)
    }
})

router.post("/users/me/avatar", auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width:250, height:250 }).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

router.delete("/users/me/avatar", auth, async (req, res) => {
    req.user.avatar = undefined
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

router.get("/users/:id/avatar", async (req, res) => {
    try{
        const user = await User.findById(req.params.id)

        if(!user || !user.avatar){
            throw new Error("This user does not uploaded avatar yet.")
        }
        
        res.set('Content-type', 'image/png')
        res.send(user.avatar)
    }catch(error){
        res.status(404).send()
    }
})

module.exports = router