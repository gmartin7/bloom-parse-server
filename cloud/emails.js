Parse.Cloud.define("testBookSaved", function(request, response) {
    var book = {'title':'the title','uploader':'the uploader','copyright':'the copyright','license':'the license', bookId:'theBookId'};
    exports.sendBookSavedEmailAsync(book).then(function(result){
        console.log("Sendgrid 'Announce Book Uploaded' completed.");
        response.success(result);
    }).catch(function(error) {
        console.log("ERROR: Sendgrid 'Announce Book Uploaded' failed: " + error);
        response.error("ERROR: Sendgrid 'Announce Book Uploaded' failed: " + error);
    });
});

// This email is sent when a book is uploaded or created.
// It is sent to an internal address, set by an appsetting in azure.
exports.sendBookSavedEmailAsync = function(book) {
    var sendgridLibrary = require('sendgrid');
    const helper = sendgridLibrary.mail;
    const mail = new helper.Mail();
    mail.setFrom(new helper.Email('bot@bloomlibrary.org', 'Bloom Bot'));
    mail.setSubject('book saved'); // Will be replaced by template
    mail.setTemplateId('cdfea777-a9d7-49bc-8fd4-26c49b773b13'); // Announce Book Uploaded
    return exports.sendEmailAboutBookAsync(book, mail, process.env.EMAIL_BOOK_EVENT_RECIPIENT);
}

// Caller should have already filled in the from, subject, and (optionally) content.
// This adds metadata about the book and sends off the email.
exports.sendEmailAboutBookAsync = function(book, sendGridMail, toAddress) {
    return new Promise(function(resolve, reject) {
        try{
            // on the unit test server, we don't want to be sending emails, so we just don't set the needed environment variables.
            if(process.env.SENDGRID_API_KEY === undefined || process.env.SENDGRID_API_KEY.length == 0) {
                console.log("SENDGRID_API_KEY environment variable not set, sendEmailAboutBookAsync() will just pretend it succeeded.");
                resolve("SENDGRID_API_KEY environment variable not set");
            }
            if(toAddress === undefined || toAddress.length == 0) {
                console.log("toAddress not set, sendEmailAboutBookAsync() will just pretend it succeeded.");
                resolve("toAddress variable not set (check environment variable)");
            }
            var sendgridLibrary = require('sendgrid');
            const helper = sendgridLibrary.mail;
            //provide the parameters for the template
            const personalization = new helper.Personalization();
            personalization.addTo(new helper.Email(toAddress)); // this is how you set the "to" address.
            personalization.addSubstitution(new helper.Substitution(':url', getBookUrl(book)));
            ['title','uploader','copyright','license'].forEach(function(property) {
                personalization.addSubstitution(new helper.Substitution(':'+property, book[property]));
            }, this);
            sendGridMail.addPersonalization(personalization);

            const sendGridInstance = sendgridLibrary(process.env.SENDGRID_API_KEY);
            const request = sendGridInstance.emptyRequest({
                method: 'POST',
                path: '/v3/mail/send',
                body: sendGridMail.toJSON()
            });
            console.log("Will be sending to SendGrid: "+JSON.stringify(request));

            sendGridInstance.API(request, function(error, response) {
                if (error) {
                    console.log('Sendgrid emptyRequest returned error: ' + error.toJSON);
                    console.log(JSON.stringify(response));
                    reject('Sendgrid emptyRequest returned error: ' + JSON.stringify(response));
                } else {
                    resolve("Success");
                }
            });
        } catch(exception) {
            reject(exception);
        }
    });
}

function getBookUrl(book) {
    return "http://www.bloomlibrary.org/browse/detail/" + book.objectId;
}