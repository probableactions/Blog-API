const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema(
	{
		title: { type: String, required: true },
		body: { type: String, required: true },
		author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		comments: [{ type: Schema.Types.ObjectId, ref: 'Comment', required: true }],
		is_published: { type: Boolean, required: true, default: false },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Post', PostSchema);