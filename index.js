/******************
 *
 * Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 *
 * @author Ahmad R. Khan
 *
 * An AWS Lambda function that integrates Twilio Programmable SMS with Amazon Lex.
 * [Twilio SMS]<--->[API Gateway]<--->[this lambda function]<--->[Amazon Lex]
 ******************/

var twilio = require('twilio');
var qs = require('qs');
var AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {
	try {
		var twilioSMS = qs.parse(event["body-json"]);
		//	************************
		//	validate and filter bad/empty messages
		//	************************
		if(!twilioSMS.hasOwnProperty('Body')){
			var error = new Error("Cannot process message without a Body.");
			callback(error);
		}
		/******COMMENTED OUT FOR TESTING; UNCOMMENT FOR PROD **********
		else if (!event.params.header.hasOwnProperty('X-Twilio-Signature')) {
			var error = new Error("Twilio signature not found.");
			callback(error);
		//	************************
		//	Below we verify that the call is coming in from Twilio.
		//	Any other source will be rejected.
		//	************************
		} else if (!twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN,
					event.params.header['X-Twilio-Signature'],
					process.env.API_GATEWAY_URL,
					twilioSMS)) {
			var error = new Error("Twilio signature could not be validated.");
			callback(error);
		}
		****************************************************************/
		else {
				//	************************
				//	Message is valid so now we prepare to pass it along to the Lex API.
				//	************************
				AWS.config.region = 'us-east-1';
				var lexruntime = new AWS.LexRuntime();
				var userNumber = twilioSMS.From.replace('+', '');
				var params = {
				  botAlias: process.env.BOT_ALIAS,
				  botName: process.env.BOT_NAME,
				  inputText: twilioSMS.Body,
				  userId: userNumber,
				  sessionAttributes: {
				  }
				};
				lexruntime.postText(params, function(err, data) {
					var twimlResponse = new twilio.TwimlResponse();
				  if (err) {
						console.log(err, err.stack); // an error occurred
			      twimlResponse.message('Sorry, we ran into a problem at our end.');
			      callback(err, twimlResponse.toString());
					} else {
						console.log(data);           // got something back from Amazon Lex
						twimlResponse.message(data.message);
		        callback(null, twimlResponse.toString());
					}
				});
		}
	} catch(e) {
		console.log(e);
		callback(e);
	}
};
