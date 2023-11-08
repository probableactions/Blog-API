const { body, validationResult } = require('express-validator');

const userSignupValidationRules = () => {
	return [
		body('first_name').trim().notEmpty().withMessage('All fields are required'),
		body('last_name').trim().notEmpty().withMessage('All fields are required'),
		body('username')
			.trim()
			.isLength({ min: 4 })
			.withMessage('Username must be at least 4 characters')
			.isLength({ max: 25 })
			.withMessage('Username must be fewer than 25 characters')
			.isAlphanumeric()
			.withMessage('Username can only contain letters and numbers'),
		body('email')
			.trim()
			.isEmail()
			.normalizeEmail()
			.withMessage('Email must be a valid email'),
		body('password')
			.isStrongPassword()
			.withMessage(
				'Password must be at least 8 characters and include at at least one uppercase, lowercase, number and symbols'
			),
	];
};

const userLoginValidationRules = () => {
	return [
		body('email').trim().notEmpty().withMessage('All fields are required'),
		body('password').trim().notEmpty().withMessage('All fields are required'),
	];
};

const commentValidationRules = () => {
	return [
		body('email').trim().notEmpty().withMessage('Comments can not be empty'),
	];
};

const postValidationRules = () => {
	return [
		body('title').trim().notEmpty().withMessage('All fields are required'),
		body('body').trim().notEmpty().withMessage('All fields are required'),
	];
};

// Ensures that a post can be published via a patch request and ensure the title and body are not deleted.
const postValidationPatchRules = () => {
	return [
		body('title')
			.trim()
			.optional()
			.notEmpty()
			.withMessage('All fields are required'),
		body('body')
			.trim()
			.optional()
			.notEmpty()
			.withMessage('All fields are required'),
	];
};
const validate = (req, res, next) => {
	const errors = validationResult(req);
	if (errors.isEmpty()) {
		return next();
	}
	const extractedErrors = [];
	errors.array().map((err) =>
		extractedErrors.push({
			status: '422',
			detail: err.msg,
		})
	);
	return res.status(422).json({
		status: 'error',
		code: 422,
		messages: ['User input errors found in request body'],
		errors: extractedErrors,
		data: null,
	});
};

module.exports = {
	userSignupValidationRules,
	userLoginValidationRules,
	commentValidationRules,
	postValidationRules,
	postValidationPatchRules,
	validate,
};
