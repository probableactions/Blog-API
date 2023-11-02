const ash = require('express-async-handler');
const mongoose = require('mongoose');

const Post = require('../models/postModel');
const User = require('../models/userModel');

exports.get_all_posts = ash(async (req, res, next) => {
	if (process.env.CMS_CROSS_ORIGIN === req.headers.origin) {
		const posts = await Post.find({}).sort({ createdAt: -1 });
		res.status(200).json(posts);
	} else {
		const posts = await Post.find({ is_published: true }).sort({
			createdAt: -1,
		});
		res.status(200).json(posts);
	}
});

exports.get_post = ash(async (req, res, next) => {
	const { postId } = req.params;
	if (!mongoose.Types.ObjectId.isValid(postId)) {
		return res.status(404).json({ msg: 'Post not found' });
	}

	const post = await Post.findById(postId);

	if (!post || !post.is_published) {
		return res.status(404).json({ msg: 'Post not found' });
	}

	res.status(200).json(post);
});

exports.create_post = ash(async (req, res, next) => {
	const { title, body } = req.body;
	const author = req.user._id;

	const emptyFields = [];
	if (!title) {
		emptyFields.push('body');
	}
	if (!body) {
		emptyFields.push('body');
	}
	if (emptyFields.length > 0) {
		return res
			.status(400)
			.json({ err: 'All fields are required', emptyFields });
	}

	try {
		const post = await Post.create({ title, body, author });
		await User.findByIdAndUpdate(
			author,
			{
				$push: { posts: post._id },
			},
			{ new: true }
		);
		res.status(200).json(post);
	} catch (err) {
		res.status(400).json({ msg: err.message });
	}
});

exports.delete_post = ash(async (req, res, next) => {
	const { postId } = req.params;
	const author = req.user._id;
	if (!mongoose.Types.ObjectId.isValid(postId)) {
		return res.status(404).json({ msg: 'Post not found' });
	}

	const post = await Post.findByIdAndDelete(postId);

	if (!post) {
		return res.status(404).json({ msg: 'Post not found' });
	}
	try {
		await User.findByIdAndUpdate(
			author,
			{
				$pull: { posts: post._id },
			},
			{ new: true }
		);
	} catch (err) {
		res.status(400).json({ msg: err.message });
	}
	res.status(200).json(post);
});

exports.update_post = ash(async (req, res, next) => {
	const { postId } = req.params;

	if (!mongoose.Types.ObjectId.isValid(postId)) {
		return res.status(404).json({ msg: 'Post not found' });
	}

	const post = await Post.findByIdAndUpdate(
		postId,
		{ ...req.body },
		{ new: true }
	);

	if (!post) {
		return res.status(404).json({ msg: 'Post not found' });
	}

	res.status(200).json(post);
});
