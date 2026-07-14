const express = require('express');
const { getGeoLocation } = require('../controllers/geoController');

const router = express.Router();

router.get('/', getGeoLocation);

module.exports = router;
