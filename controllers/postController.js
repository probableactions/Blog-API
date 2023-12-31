const ash = require('express-async-handler');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const Post = require('../models/postModel');
const User = require('../models/userModel');

exports.get_all_posts = ash(async (req, res, next) => {
	let { tag, page, pageSize, sort } = req.query;
	const filter = [tag && { tags: tag }].filter(Boolean);
	try {
		sort = parseInt(sort, 10) || -1;
		page = parseInt(page, 10) || 1;
		pageSize = parseInt(pageSize, 10) || 20;
		if (process.env.CMS_CROSS_ORIGIN === req.headers.origin) {
			filter.push({});
		} else {
			filter.push({ is_published: true });
		}
		const posts = await Post.aggregate([
			{
				$facet: {
					metadata: [{ $count: 'totalCount' }],
					data: [
						{ $sort: { createdAt: sort } },
						{ $skip: (page - 1) * pageSize },
						{ $limit: pageSize },
						{
							$match: {
								$and: filter,
							},
						},
					],
				},
			},
		]);
		res.status(200).json({
			status: 'ok',
			code: 200,
			messages: ['Successfully retrieved posts'],
			errors: null,
			links: {
				prev:
					page > 1
						? `${process.env.SERVER_ORIGIN}/api/posts/?page=${
								page - 1
						  }&pageSize=${pageSize}`
						: null,
				next:
					Math.ceil(page * pageSize) <= posts[0].metadata[0].totalCount
						? `${process.env.SERVER_ORIGIN}/api/posts/?page=${
								page + 1
						  }&pageSize=${pageSize}`
						: null,
			},
			metadata: {
				totalCount: posts[0].metadata[0].totalCount,
				page,
				pageSize,
				filter,
			},
			data: posts[0].data,
		});
	} catch (err) {
		res.status(500).json({
			status: 'error',
			code: 500,
			messages: ['Error retrieving posts'],
			errors: [
				{
					status: '500',
					detail: err.message,
				},
			],
			data: null,
		});
	}
});

exports.get_post = ash(async (req, res, next) => {
	const { postId } = req.params;

	if (!mongoose.Types.ObjectId.isValid(postId)) {
		return res.status(406).json({
			status: 'error',
			code: 406,
			messages: ['Post not found'],
			errors: [
				{
					status: '406',
					detail: 'Provided id is not a valid Post id. Incorrect type.',
				},
			],
			data: null,
		});
	}

	const post = await Post.findById(postId);

	if (!post) {
		return res.status(404).json({
			status: 'error',
			code: 404,
			messages: ['Post not found'],
			errors: [
				{
					status: '404',
					detail: 'Post does not exist',
				},
			],
			data: null,
		});
	}

	res.status(200).json({
		status: 'ok',
		code: 200,
		messages: ['Successfully retrieved post'],
		errors: null,
		data: post,
	});
});

exports.create_post = ash(async (req, res, next) => {
	// eslint-disable-next-line camelcase
	const { title, body, tags, img_src, img_src_link } = req.body;
	const author = req.user._id;
	const img = {
		url: req.file.path,
		public_id: req.file.filename,
		// eslint-disable-next-line camelcase
		src: img_src,
		// eslint-disable-next-line camelcase
		src_link: img_src_link,
	};

	try {
		const post = await Post.create({ title, body, author, img, tags });
		await User.findByIdAndUpdate(
			author,
			{
				$push: { posts: post._id },
			},
			{ new: true }
		);
		res.status(200).json({
			status: 'ok',
			code: 200,
			messages: ['Successfully created post'],
			errors: null,
			data: post,
		});
	} catch (err) {
		res.status(400).json({
			status: 'error',
			code: 400,
			messages: ['Error creating post'],
			errors: [
				{
					status: '400',
					detail: err.message,
				},
			],
			data: null,
		});
	}
});

exports.delete_post = ash(async (req, res, next) => {
	const { postId } = req.params;
	const author = req.user._id;
	if (!mongoose.Types.ObjectId.isValid(postId)) {
		return res.status(406).json({
			status: 'error',
			code: 406,
			messages: ['Post not found'],
			errors: [
				{
					status: '406',
					detail: 'Provided id is not a valid post id. Incorrect type.',
				},
			],
			data: null,
		});
	}

	const post = await Post.findById(postId);

	if (!post) {
		return res.status(404).json({
			status: 'error',
			code: 404,
			messages: ['Error deleting post'],
			errors: [
				{
					status: '404',
					detail: 'Post does not exist',
				},
			],
			data: null,
		});
	}

	try {
		await cloudinary.uploader.destroy(post.img.public_id);
		await Post.findByIdAndDelete(postId);
		await User.findByIdAndUpdate(
			author,
			{
				$pull: { posts: post._id },
			},
			{ new: true }
		);
	} catch (err) {
		res.status(400).json({
			status: 'error',
			code: 400,
			messages: ['Error deleting post'],
			errors: [
				{
					status: '400',
					detail: err.message,
				},
			],
			data: null,
		});
	}
	res.status(200).json({
		status: 'success',
		code: 200,
		messages: ['Post successfully deleted'],
		errors: null,
		data: post,
	});
});

exports.update_post = ash(async (req, res, next) => {
	const { postId } = req.params;
	if (!mongoose.Types.ObjectId.isValid(postId)) {
		return res.status(406).json({
			status: 'error',
			code: 406,
			messages: ['Post not found'],
			errors: [
				{
					status: '406',
					detail: 'Provided id is not a valid Post id. Incorrect type.',
				},
			],
			data: null,
		});
	}

	const post = await Post.findById(postId);

	if (!post) {
		return res.status(404).json({
			status: 'error',
			code: 404,
			messages: ['Error updating post'],
			errors: [
				{
					status: '404',
					detail: 'The post was not found and can not be updated',
				},
			],
			data: null,
		});
	}
	try {
		if (req.file) {
			await cloudinary.uploader.destroy(post.img.public_id);
		}
		const updatedPost = await Post.findByIdAndUpdate(
			postId,
			req.file
				? {
						...req.body,
						$set: {
							'img.url': req.file.path,
							'img.public_id': req.file.filename,
							'img.src': req.body.img_src,
							'img.src_link': req.body.img_src_link,
						},
				  }
				: {
						...req.body,
						$set: {
							'img.src': req.body.img_src,
							'img.src_link': req.body.img_src_link,
						},
				  },
			{ new: true }
		);
		res.status(200).json({
			status: 'ok',
			code: 200,
			messages: ['Successfully updated post'],
			errors: null,
			data: updatedPost,
		});
	} catch (err) {
		return res.status(404).json({
			status: 'error',
			code: 404,
			messages: ['Error updating post'],
			errors: [
				{
					status: '404',
					detail: err.message,
				},
			],
			data: null,
		});
	}
});
