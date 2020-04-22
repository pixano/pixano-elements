/**
 * Dummy server that receives a polygon and resend one
 * Replace in it whatever algorithm you want
 * @copyright CEA-LIST/DIASI/SIALV/LVA (2019)
 * @author CEA-LIST/DIASI/SIALV/LVA <pixano@cea.fr>
 * @license CECILL-C
*/

const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors({origin: 'http://localhost:5000'}));
app.use(express.json());

app.post('/stuff', (req, res) => {
    console.log("got request", req.body)
    const inputPolygon = req.body.polygon;
    // TODO: stuff
    // ...
    const outputPolygon = {...inputPolygon, color: 'green'};
    res.json({polygon: outputPolygon});
});
app.listen(4000);
console.log('Running external server at port', 4000);
