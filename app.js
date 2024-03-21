// Import required modules
var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var redis = require('redis');

// Create an Express application
var app = express();

// Create a Redis client for general operations
var client = redis.createClient();

// Listen for the 'connect' event
client.on('connect', function() {
    console.log('Connected to Redis server');
});

// Set up view engine and views directory
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set up middleware
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Define routes
app.get('/', function(req, res) {
    var title = 'Task List';

    // Retrieve tasks from Redis list
    client.lrange('tasks', 0, -1, function (err, reply) {

        client.hgetall('call', function(err, call){
            if (err) {
                console.error('Error retrieving tasks from Redis:', err);
                return res.status(500).send('Error retrieving tasks from Redis');
            }
            // Render the page with retrieved tasks
            res.render('index', {
                title: title,
                tasks: reply,
                call: call
            });
        });

    });
});

// Route for adding a task
app.post('/task/add', function(req, res) {
    var task = req.body.task;

    // Validate if task is empty
    if (!task || task.trim() === '') {
        return res.status(400).send('Task cannot be empty');
    }

    client.rpush('tasks', task, function(err, reply) {
        if (err) {
            console.error('Error adding task to Redis:', err);
            return res.status(500).send('Error adding task to Redis');
        }
        console.log('Task Added:', task);
        res.redirect('/');
    });
});

// Route for deleting tasks
app.post('/task/delete', function(req, res) {
    var tasksToDelete = req.body.tasks;

    // Ensure tasksToDelete is an array
    if (!Array.isArray(tasksToDelete)) {
        tasksToDelete = [tasksToDelete]; // Convert to array if it's not already
    }

    // Remove each task individually
    tasksToDelete.forEach(function(task) {
        client.lrem('tasks', 0, task, function(err, reply) {
            if (err) {
                console.error('Error deleting task from Redis:', err);
                return res.status(500).send('Error deleting task from Redis');
            }
            console.log('Task Deleted:', task);
        });
    });

    res.redirect('/');
});

// Route for adding a call
app.post('/call/add', function(req, res) {
    var newCall = {
        name: req.body.name,
        company: req.body.company,
        phone: req.body.phone,
        time: req.body.time
    };

    client.hmset('call', ['name', newCall.name, 'company', newCall.company, 'phone', newCall.phone, 'time', newCall.time], function(err, reply) {
        if (err) {
            console.error(err);
            return res.status(500).send('Error adding call to Redis');
        }
        console.log('Call Added:', newCall);
        res.redirect('/');
    });
});

// Start the server
var port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log('Server Started On Port ' + port);
});

module.exports = app;
