var scene, camera, renderer, controls,
	graph, data, means, intvl,
	thresh,
	angle = 0, dAngle = 0.005;

const axisRange = 20,
	dataRange = 15,
	cameraR = 50,
	colors = [
		0xff00ff, 0xffff00, 0x00ffff, 
		0x00ff77, 0xff7700, 0x7700ff,
		0xff0077, 0x77ff00, 0x0077ff
	];

function init(){
	const w = .8*window.innerWidth,
		h = window.innerHeight;
	
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(w, h);
	document.getElementById("glCanvas").appendChild(renderer.domElement);

	camera = new THREE.PerspectiveCamera(45, w / h, 1, 500);
	camera.position.set(0, 0, cameraR);

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.addEventListener('change', render);
	controls.enablePan = true;
	controls.enableRotate = true;
	controls.enableZoom = true;

	scene = new THREE.Scene();
	scene.add(new THREE.AmbientLight(0x736F6E));

	graph = new THREE.Object3D();
	var axes = drawAxes(axisRange);
	graph.add(axes);
	scene.add(graph);

	$("#spin").change(function(){
		if(this.checked){
			camera.position.set(0, 0, cameraR);
			dAngle = 0.005;
		} else {
			dAngle = 0;
		}
	})

	render();
}

function render(){
	requestAnimationFrame(render);
	camera.position.x = cameraR * Math.cos(angle);
	camera.position.y = cameraR * Math.sin(angle);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
	renderer.render(scene, camera);
	angle += dAngle;
}

function simulation(){
	thresh = $("#thresh").val();
	console.log(thresh);
	const kMeans = $("#kMeans").val(),
		nPts = $("#nPts").val(),
		period = $("#period").val();

	if(data){ resetSimulation() }

	//generate points
	data = generateData(nPts, dataRange);
	_.each(data, (e,i)=>{
		graph.add(drawPoint(e,i))
	});

	//after brief delay, add means
	setTimeout(()=>{
		means = {}
		_.times(kMeans, i=>{
			means[i] = {
				coords: newPointBetween(-10,10),
				points: [],
				color: colors[i]
			}
			let pt = drawPoint(means[i].coords, "mean-"+i, r=.5, color=means[i].color)
			graph.add(pt);
		});
		intvl = setInterval(findClosest,period)
	},2*period);
}

function drawPoint(pos, index, r=.2, color=0xffffff){
	var geom = new THREE.SphereGeometry(r, 20, 20);
	var pt = new THREE.Mesh( geom, solidM(color) )
	pt.name = "point-"+index
	pt.position.set(pos[0], pos[1], pos[2])
	return pt;
}

function movePoint(name, to){
	scene.getObjectByName(name).position.set(to[0], to[1], to[2]);
}

function drawAxes(range){
	var axes = new THREE.Object3D();

	var xGeom = new THREE.Geometry();
	xGeom.vertices.push(new THREE.Vector3(-range, 0, 0));
	xGeom.vertices.push(new THREE.Vector3(range, 0, 0));

	var yGeom = new THREE.Geometry();
	yGeom.vertices.push(new THREE.Vector3(0, -range, 0));
	yGeom.vertices.push(new THREE.Vector3(0, range, 0));

	var zGeom = new THREE.Geometry();
	zGeom.vertices.push(new THREE.Vector3(0, 0, -range));
	zGeom.vertices.push(new THREE.Vector3(0, 0, range));

	axes.add( new THREE.Line(xGeom, lineM(0xff0000)));
	axes.add( new THREE.Line(yGeom, lineM(0x00ff00)));
	axes.add( new THREE.Line(zGeom, lineM(0x0000ff)));

	return axes;
}

function lineM(color){
	return new THREE.LineBasicMaterial({ color: color });
}

function solidM(color){
	return new THREE.MeshPhongMaterial({ 
		color: color, 
		shading: THREE.SmoothShading, 
		shininess: 80, 
		transparent: true, 
		opacity: .9
	});
}

function generateData(n, range){
	data = []
	_.times(n, ()=>{
		data.push(newPointBetween(-range, range))
	})
	return data;
}

function newPointBetween(x,y){
	let pt = [];
	_.times(3,()=>pt.push(randIntBetween(x,y)))
	return pt;
}

function randIntBetween(x,y){
	return Math.floor((y-x)*Math.random() + x);
}

function distance(a,b){
	return Math.sqrt(Math.pow(a[0] - b[0],2) + Math.pow(a[1] - b[1],2) + Math.pow(a[2] - b[2],2))
}

function getNewMean(points){
	let sums = _.reduce(points,(t,v)=>{
		return [t[0]+v[0],t[1]+v[1],t[2]+v[2]];
	},[0,0,0]);
	return sums.map(o=>o/points.length);
}

function findClosest(){
	$("#iter").text( parseInt($("#iter").text()) + 1 );
	_.each(data, (pt, i)=>{
		//1 find closest mean
		let distToMyMean = Infinity,
			myMean = null;
		_.forEach(means, (mv, mk)=>{
			let d = distance(pt, mv.coords)
			if(d < distToMyMean){
				distToMyMean = d;
				myMean = mk
			}
		})
		//2 recolor accordingly
		means[myMean].points.push(pt)
		scene.getObjectByName("point-"+i).material.color.setHex(means[myMean].color);
	})
	//3 reposition means
	_.forEach(means, (mv, mk)=>{
		let newMean = getNewMean(mv.points);
		if(newMean[0] < thresh && 
			 newMean[1] < thresh &&
			 newMean[2] < thresh){
			iterationFinished();
		}
		means[mk].coords = newMean;
		movePoint("point-mean-"+mk, newMean)
	})
}

function iterationFinished(){
	clearInterval(intvl);
	$("#iter").text( parseInt($("#iter").text()) + " (FINAL)" );
}

function resetSimulation(){
	clearInterval(intvl);
	_.each(data, (e,i)=>{
		graph.remove( scene.getObjectByName("point-"+i) );
	});
	_.forEach(means, (mv, mk)=>{
		graph.remove( scene.getObjectByName("point-mean-"+mk));
	});
	$("#iter").text(0);
}