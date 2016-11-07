
Parse.Cloud.define("testBookSaved", function(request, response) {
    var book = {'title':'the title','uploader':'the uploader','copyright':'the copyright','license':'the license', bookId:'theBookId'};
    sendBookSavedEmailAsync(book).then(function(){
        console.log("Sendgrid 'Announce Book Uploaded' completed.");
        response.success("Success");
    }).catch(function(error) {
        console.log("ERROR: Sendgrid 'Announce Book Uploaded' failed: " + error);
        response.error("ERROR: Sendgrid 'Announce Book Uploaded' failed: " + error);
    });
});



// This email is sent when a book is uploaded or created.
// It is sent to an internal address, set by an appsetting in azure.
function sendBookSavedEmailAsync(book) {
    var sendgridLibrary = require('sendgrid');
    const helper = sendgridLibrary.mail;
    const mail = new helper.Mail();
    mail.setFrom(new helper.Email('bot@bloomlibrary.org', 'Bloom Bot'));
    mail.setSubject('book saved'); // Will be replaced by template
    mail.setTemplateId('cdfea777-a9d7-49bc-8fd4-26c49b773b13'); // Announce Book Uploaded
    return sendEmailAboutBookAsync(book, mail, process.env.EMAIL_BOOK_EVENT_RECIPIENT);
}

// Caller should have already filled in the from, to, subject, and content.
// This adds metedata about the book and sends off the email.
function sendEmailAboutBookAsync(book, sendGridMail, toAddress) {
    return new Promise(function(resolve, reject) {
        try{
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
                    resolve();
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