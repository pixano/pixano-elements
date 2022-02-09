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
app.use(cors({origin: 'http://192.168.1.84:3000'}));
app.use(express.json());

app.get('/', function(req, res, next) {
    res.send("Hello world");
});

app.post('/', (req, res) => {
	console.log("got request", req.body)
	const ob = {
		X: 63.0331258,
		Y: 28.7155611,
	  }
	// const inputPolygon = req.body.polygon;
	// TODO: stuff
	// ...
	// const outputPolygon = {color: 'green'};
	res.json(JSON.stringify(ob));
});
app.listen(4000);
console.log('Running external server at port', 4000);
