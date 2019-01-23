var nodemailer = require("nodemailer");


var transport = nodemailer.createTransport("SMTP", {
    host: "internet.winwholesale.com", // host name
    secureConnection: false, // use SSL
    port: 25, // port for secure SMTP
    auth: {
        user: "gebirecki",
       pass: "*********"
        	
    }
});

console.log("SMTP Configured");

var mailOptions = {
    from: 'gebirecki@winsupplyinc.com', // sender address
    to: 'gebirecki@winsupplyinc.com', // list of receivers
    subject: 'Report for Test Result', // Subject line
    text: 'Contains the test result for the automation test in html file', // plaintext body
    attachments: [
        {
            'filename': 'Results.html',
            //'filePath': './allure-report/index.html',
            'filepath':'C:\Users\gebirecki\protractorworkspace\Protractor6\Tests\allure-report\index.html',
        }

    ]
};
transport.sendMail(mailOptions, function (error, response) {
    if (error) {
        console.log(error);
        response.send(err);
    } else {
        console.log("Message sent: " + response.message);
        response.send(info);
    }

});
