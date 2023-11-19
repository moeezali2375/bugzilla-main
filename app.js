const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const path = require("path");
const { log } = require("console");
const moment = require("moment");
require("dotenv").config();
//=====================================================
//
//                ###    #####   #####
//               ## ##   ##  ##  ##  ##
//              ##   ##  #####   #####
//              #######  ##      ##
//              ##   ##  ##      ##
//
//=====================================================

const app = express();
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
	session({
		secret: "this is our little secret",
		resave: false,
		saveUninitialized: false,
	})
);

app.use(passport.initialize());
app.use(passport.session());

async function connect() {
	const string = process.env.DB;
	await mongoose.connect(string);
	console.log("Db connected");
}
const ok = connect();

app.listen(3000, function () {
	console.log("server started on port 3000");
});

//======================================================================================
//
//               ####   ####  ##   ##  #####  ###    ###    ###     ####
//              ##     ##     ##   ##  ##     ## #  # ##   ## ##   ##
//               ###   ##     #######  #####  ##  ##  ##  ##   ##   ###
//                 ##  ##     ##   ##  ##     ##      ##  #######     ##
//              ####    ####  ##   ##  #####  ##      ##  ##   ##  ####
//
//======================================================================================

const userSchema = new mongoose.Schema({
	username: {
		type: String,
	},
	email: {
		type: String,
		unique: true,
	},
	usertype: {
		type: String,
	},
});

//! Manager
const managerSchema = new mongoose.Schema({
	userid: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		unique: true,
	},
	projects: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Project",
		},
	],
});

const Manager = new mongoose.model("manager", managerSchema);

//! Developer
const developerSchema = new mongoose.Schema({
	userid: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		unique: true,
	},
	projects: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Project",
		},
	],
	bugs: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Bug",
		},
	],
});

const Developer = new mongoose.model("developer", developerSchema);

//! Qa
const qaSchema = new mongoose.Schema({
	userid: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		unique: true,
	},
	projects: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Project",
		},
	],
});

const Qa = new mongoose.model("qa", qaSchema);

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("user", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//! Project
const projectSchema = new mongoose.Schema({
	project_name: {
		type: String,
		unique: [true, "Project already exists"],
	},
	project_manager: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Manager",
	},
	project_devs: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Developer",
		},
	],
	project_qas: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Qa",
		},
	],
});

const Project = new mongoose.model("project", projectSchema);

//! BUG
const bugSchema = new mongoose.Schema({
	creator: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Qa",
	},
	project_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Project",
	},
	title: {
		type: String,
		unique: true,
	},
	description: {
		type: String,
	},
	status: {
		type: String,
	},
	type: {
		type: String,
	},
	deadline: {
		type: Date,
	},
	assigned_to_developer: {
		type: Boolean,
	},
});

const Bug = new mongoose.model("bugs", bugSchema);

//=============================================================================
//
//              #####     #####   ##   ##  ######  #####   ####
//              ##  ##   ##   ##  ##   ##    ##    ##     ##
//              #####    ##   ##  ##   ##    ##    #####   ###
//              ##  ##   ##   ##  ##   ##    ##    ##        ##
//              ##   ##   #####    #####     ##    #####  ####
//
//=============================================================================

app.get("/", function (req, res) {
	res.redirect("/welcome");
});

app.get("/welcome", (req, res) => {
	res.render("welcome");
});

app.get("/logout", function (req, res) {
	req.logout(function (err) {
		if (err) {
			console.log(err);
		} else {
			res.redirect("/");
		}
	});
});

app.get("/register", function (req, res) {
	res.render("register");
});

app.get("/login", function (req, res) {
	res.render("login");
});

app.get("/loggedin", function (req, res) {
	if (req.isAuthenticated()) {
		if (req.user.usertype === "developer") res.redirect("/developer/home");
		else if (req.user.usertype === "manager") res.redirect("/manager/home");
		else if (req.user.usertype === "qa") res.redirect("/qa/home");
	} else {
		res.redirect("/register");
	}
});

//TODO Manager Routes
app.get("/manager/home", (req, res) => {
	if (req.isAuthenticated()) {
		res.render("manager/home");
	}
});

app.get("/manager/createproject", (req, res) => {
	if (req.isAuthenticated()) {
		const devs = [];
		const qas = [];
		User.find({})
			.then(function (docs) {
				for (let i = 0; i < docs.length; i++) {
					if (docs[i].usertype === "developer") {
						const dev = {
							name: docs[i].username,
							id: docs[i]._id,
						};
						devs.push(dev);
					} else if (docs[i].usertype === "qa") {
						const qa = {
							name: docs[i].username,
							id: docs[i]._id,
						};
						qas.push(qa);
					}
				}
				res.render("manager/createproject", { developers: devs, qas: qas });
			})
			.catch(function (err) {
				console.log("error:" + err);
			});
	}
});

app.get("/manager/editproject", (req, res) => {
	if (req.isAuthenticated()) {
		Project.find({ project_manager: req.user._id })
			.then(function (docs) {
				// console.log(docs);
				res.render("manager/editproject", { array: docs });
			})
			.catch(function (err) {
				console.log("error:" + err);
			});
	}
});

app.get("/manager/editproject/:projectid", async (req, res) => {
	if (req.isAuthenticated()) {
		const projectid = req.params.projectid;
		const project = await Project.findOne({ _id: projectid });
		const devs = [];
		const qas = [];
		User.find({}).then(function (docs) {
			for (let i = 0; i < docs.length; i++) {
				if (docs[i].usertype === "developer") {
					if (project.project_devs.includes(docs[i]._id) == 1) {
					} else {
						const dev = {
							name: docs[i].username,
							id: docs[i]._id,
						};
						devs.push(dev);
					}
				} else if (docs[i].usertype === "qa") {
					if (project.project_qas.includes(docs[i]._id) == 1) {
					} else {
						const qa = {
							name: docs[i].username,
							id: docs[i]._id,
						};
						qas.push(qa);
					}
				}
			}
			res.render("manager/editaproject", {
				project: project,
				developers: devs,
				qas: qas,
			});
		});
	} else console.log("Login bitch");
});

app.get("/manager/editaproject/removedevqas/:projectid", async (req, res) => {
	if (req.isAuthenticated()) {
		const projectId = req.params.projectid;
		const project_ref = await Project.findOne({ _id: projectId });
		const project_devs = project_ref.project_devs;
		const project_qas = project_ref.project_qas;
		const devs = [];
		const qas = [];
		for (let i = 0; i < project_devs.length; i++) {
			const user = await User.findOne({ _id: project_devs[i] });
			const dev = {
				name: user.username,
				id: user._id,
			};

			devs.push(dev);
		}
		for (let i = 0; i < project_qas.length; i++) {
			const user = await User.findOne({ _id: project_qas[i] });
			const qa = {
				name: user.username,
				id: user._id,
			};
			qas.push(qa);
		}

		res.render("manager/removedev", {
			project: project_ref,
			developers: devs,
			qas: qas,
		});
	} else console.log("Login bitch");
});

app.get("/manager/deleteproject", (req, res) => {
	if (req.isAuthenticated()) {
		Project.find({ project_manager: req.user._id })
			.then(function (docs) {
				// console.log(docs);
				res.render("manager/deleteproject", { array: docs });
			})
			.catch(function (err) {
				console.log("error:" + err);
			});
	}
});

//TODO Developer Routes
app.get("/developer/home", (req, res) => {
	if (req.isAuthenticated()) {
		res.render("developer/home");
	}
});

app.get("/developer/resolveabug", async (req, res) => {
	if (req.isAuthenticated()) {
		const dev_ref = await Developer.findOne({
			userid: req.user._id,
		});
		const bugs = [];
		for (let i = 0; i < dev_ref.bugs.length; i++) {
			const bug = await Bug.findOne({
				_id: dev_ref.bugs[i],
			});
			bugs.push(bug);
		}
		console.log(bugs);
		res.render("developer/resolveabug", { array: bugs });
	}
});

app.get("/developer/showmyproject", async (req, res) => {
	if (req.isAuthenticated()) {
		const dev_ref = await Developer.findOne({
			userid: req.user._id,
		});
		const project = [];
		for (let i = 0; i < dev_ref.projects.length; i++) {
			const new_project = await Project.findOne({
				_id: dev_ref.projects[i],
			});
			project.push(new_project);
		}
		res.render("developer/showmyproject", { array: project });
	}
});

app.get("/developer/showbugs/:projectid", async (req, res) => {
	const projectId = req.params.projectid;
	const bugs = await Bug.find({
		project_id: projectId,
		//TODO add check for not assigned bugs
	});

	res.render("developer/showbugs", { array: bugs });
});

app.get("/developer/viewbug/:bugid", async (req, res) => {
	const bugId = req.params.bugid;
	const bug = await Bug.findOne({
		_id: bugId,
	});
	const creator_name = await User.findOne({
		_id: bug.creator,
	});
	const date = moment(bug.deadline).format("YYYY-MM-DD");
	res.render("developer/viewbug", {
		bug: bug,
		creator: creator_name.username,
		deadline: date,
		devID: req.user._id,
	});
});
// TODO QA Routes
app.get("/qa/home", (req, res) => {
	if (req.isAuthenticated()) {
		res.render("qa/home");
	} else {
		console.log("login");
	}
});

app.get("/qa/showmyproject", async (req, res) => {
	if (req.isAuthenticated()) {
		console.log(req.user._id);
		const QA = await Qa.findOne({
			userid: req.user._id,
		});
		const projects = [];
		for (let i = 0; i < QA.projects.length; i++) {
			const new_project = await Project.findOne({ _id: QA.projects[i] });
			projects.push(new_project);
		}
		res.render("qa/showmyproject", { array: projects });
	} else {
		console.log("login");
	}
});

app.get("/qa/showallproject", async (req, res) => {
	if (req.isAuthenticated()) {
		const projects = await Project.find();
		res.render("qa/showallproject", { array: projects });
	} else {
		console.log("login");
	}
});

// app.get("/qa/showbug", (req, res) => {
// 	if (req.isAuthenticated()) {
// 		res.render("qa/showbug");
// 	} else {
// 		console.log("login");
// 	}
// });

app.get("/qa/reportbug/:projectid", async (req, res) => {
	const projectId = req.params.projectid;
	console.log("here");
	res.render("qa/reportbug", { projectId: projectId });
});
//===================================================================
//
//              #####    #####    ####  ######   ####
//              ##  ##  ##   ##  ##       ##    ##
//              #####   ##   ##   ###     ##     ###
//              ##      ##   ##     ##    ##       ##
//              ##       #####   ####     ##    ####
//
//===================================================================

//!AUTH
app.post("/register", function (req, res) {
	const new_user = new User({
		username: req.body.username,
		email: req.body.email,
		usertype: req.body.usertype,
	});
	User.register(new_user, req.body.password, function (error, user) {
		if (error) {
			console.log("error:" + error);
			res.redirect("/register");
		} else {
			passport.authenticate("local")(req, res, function () {
				const new_id = {
					userid: new_user.id,
				};
				if (new_user.usertype === "manager") {
					Manager.insertMany(new_id)
						.then(function (docs) {
							console.log("Manager added!");
							res.redirect("login");
						})
						.catch(function (err) {
							console.log("error:" + err);
						});
				} else if (new_user.usertype === "developer") {
					Developer.insertMany(new_id)
						.then(function (docs) {
							console.log("Developer added!");
							res.redirect("login");
						})
						.catch(function (err) {
							console.log("error:" + err);
						});
				} else {
					Qa.insertMany(new_id)
						.then(function (docs) {
							console.log("Qa added!");
							res.redirect("login");
						})
						.catch(function (err) {
							console.log("error:" + err);
						});
				}
			});
		}
	});
});

app.post("/login", function (req, res) {
	User.findOne({ email: req.body.email }).then(function (docs) {
		const new_user = new User({
			username: docs.username,
			email: req.body.email,
			password: req.body.password,
		});
		req.login(new_user, function (err) {
			if (err) {
			} else {
				res.redirect("/loggedin");
			}
		});
	});
});

//! TODO Manager-posts
app.post("/manager/createproject", (req, res) => {
	const projectName = req.body.project_name;
	const manager = req.user._id;
	const devs = req.body.projectdev;
	const qas = req.body.projectqa;
	const new_project = {
		project_name: projectName,
		project_manager: manager,
		project_devs: devs,
		project_qas: qas,
	};
	Project.insertMany(new_project)
		.then(function (docs) {
			const projectID = docs[0]._id;
			const devID = devs;
			const QaID = qas;
			//MANAGER
			Manager.findOneAndUpdate(
				{ userid: manager },
				{ $push: { projects: projectID } },
				{ new: true }
			).then((docs) => {
				// console.log("Manager added");
			});
			//DEVS
			if (typeof devID === "object") {
				for (let i = 0; i < devID.length; i++) {
					Developer.findOneAndUpdate(
						{ userid: devID[i] },
						{ $push: { projects: projectID } },
						{ new: true }
					).then(function (devRes) {
						// console.log("Dev added! " + devRes);
					});
				}
			} else {
				Developer.findOneAndUpdate(
					{ userid: devID },
					{ $push: { projects: projectID } },
					{ new: true }
				).then(function (devRes) {
					// console.log("Dev added! " + devRes);
				});
			}
			//QAS
			if (typeof QaID === "object") {
				for (let i = 0; i < QaID.length; i++) {
					Qa.findOneAndUpdate(
						{ userid: QaID[i] },
						{ $push: { projects: projectID } },
						{ new: true }
					).then(function (qaRes) {
						// console.log("Qa Added! " + qaRes);
					});
				}
			} else {
				Qa.findOneAndUpdate(
					{ userid: QaID },
					{ $push: { projects: projectID } },
					{ new: true }
				).then(function (qaRes) {
					// console.log("Qa Added! " + qaRes);
				});
			}
		})
		.catch(function (err) {
			console.log("error:" + err);
		});
	res.redirect("/manager/home");
});

app.post("/manager/editaproject/:projectid", async (req, res) => {
	try {
		const projectName = req.body.project_name;
		const devs = req.body.projectdev;
		const qas = req.body.projectqa;
		const projectID = req.params.projectid;
		// const project_ref = await Project.findOne({ project_name: projectName });
		if (projectName) {
			await Project.findOneAndUpdate(
				{ _id: projectID },
				{ project_name: projectName }
			);
			console.log("Name updated succesffully");
		}
		if (devs) {
			if (typeof devs === "object") {
				for (let i = 0; i < devs.length; i++) {
					await Developer.findOneAndUpdate(
						{ userid: devs[i] },
						{ $push: { projects: projectID } },
						{ new: true }
					);
					await Project.findOneAndUpdate(
						{ _id: projectID },
						{ $push: { project_devs: devs[i] } }
					);
				}
			} else {
				await Developer.findOneAndUpdate(
					{ userid: devs },
					{ $push: { projects: projectID } },
					{ new: true }
				);
				await Project.findOneAndUpdate(
					{ _id: projectID },
					{ $push: { project_devs: devs } }
				);
			}
		}
		if (qas) {
			if (typeof qas === "object") {
				for (let i = 0; i < qas.length; i++) {
					await Qa.findOneAndUpdate(
						{ userid: qas[i] },
						{ $push: { projects: projectID } },
						{ new: true }
					);
					await Project.findOneAndUpdate(
						{ _id: projectID },
						{ $push: { project_qas: qas[i] } }
					);
				}
			} else {
				await Qa.findOneAndUpdate(
					{ userid: qas },
					{ $push: { projects: projectID } },
					{ new: true }
				);
				await Project.findOneAndUpdate(
					{ _id: projectID },
					{ $push: { project_qas: qas } }
				);
			}
		}
		res.redirect("/manager/home");
	} catch (error) {
		console.log("error: " + error);
	}
});

app.post("/manager/removedev/:projectid", async (req, res) => {
	try {
		const projectId = req.params.projectid;
		let devs = [];
		let qas = [];
		if (typeof req.body.projectdev === "string") devs.push(req.body.projectdev);
		else devs = req.body.projectdev;

		if (typeof req.body.projectqa === "string") qas.push(req.body.projectqa);
		else qas = req.body.projectqa;
		if (devs) {
			for (let i = 0; i < devs.length; i++) {
				await Developer.findOneAndUpdate(
					{ userid: devs[i] },
					{ $pull: { projects: projectId } },
					{ new: true }
				);
				await Project.findOneAndUpdate(
					{ _id: projectId },
					{ $pull: { project_devs: devs[i] } },
					{ new: true }
				);
			}
		}
		if (qas) {
			for (let i = 0; i < qas.length; i++) {
				await Qa.findOneAndUpdate(
					{ userid: qas[i] },
					{ $pull: { projects: projectId } },
					{ new: true }
				);
				await Project.findOneAndUpdate(
					{ _id: projectId },
					{ $pull: { project_qas: qas[i] } },
					{ new: true }
				);
			}
		}
		res.redirect("/manager/home");
	} catch (error) {
		console.log(error);
	}
});

const deleteprojects = async (id) => {
	try {
		const project = await Project.findOne({ _id: id });
		const manager_id = await project.project_manager;
		const dev_ids = await project.project_devs;
		const qa_ids = await project.project_qas;
		//DEVS
		for (let i = 0; i < dev_ids.length; i++) {
			await Developer.findOneAndUpdate(
				{ userid: dev_ids[i] },
				{ $pull: { projects: project._id } },
				{ new: true }
			);
		}
		//QAS
		for (let i = 0; i < qa_ids.length; i++) {
			await Qa.findOneAndUpdate(
				{ userid: qa_ids[i] },
				{ $pull: { projects: project._id } },
				{ new: true }
			);
		}
		//MANAGER
		await Manager.findOneAndUpdate(
			{ userid: manager_id },
			{ $pull: { projects: project._id } },
			{ new: true }
		);
		//PROJECT
		await Project.findByIdAndDelete(project._id);
	} catch (error) {
		console.log("error while deleting the project" + error);
	}
};

app.post("/manager/deleteproject", (req, res) => {
	const projectId = req.body.deletebutton;
	deleteprojects(projectId);
	res.redirect("/manager/home");
});

//! TODO Developer-posts
app.post("/developer/assignbug/:devID", async (req, res) => {
	const devID = req.params.devID;
	const bugID = req.body.submitbutton;
	await Developer.findOneAndUpdate(
		{ userid: devID },
		{ $push: { bugs: bugID } },
		{ new: true }
	);
	res.redirect("/developer/home");
});

app.post("/developer/solveabug", async (req, res) => {
	console.log("here in post");
	const bugID = req.body.resolveid;
	console.log(bugID);
	await Bug.findOneAndUpdate({ _id: bugID }, { status: "resolved" });
	res.redirect("/developer/home");
});
//! TODO QA-posts
app.post("/qa/reportbug/:projectid", async (req, res) => {
	try {
		const projectId = req.params.projectid;
		const new_bug = {
			creator: req.user._id,
			project_id: projectId,
			title: req.body.bug_title,
			description: req.body.bug_description,
			status: req.body.status,
			type: req.body.bug_type,
			deadline: req.body.bug_date,
			assigned_to_developer: false,
		};
		const registered_bug = await Bug.insertMany(new_bug);
		res.redirect("/qa/home");
	} catch (error) {
		console.log(error);
	}
});
