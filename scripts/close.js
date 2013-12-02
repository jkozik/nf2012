
/* Report->Close */
function dialogCloseSubmit() {
    /*
    ** The Close report menu item sets up the steps to do a year-end
    ** closing of the current year's bookkeeping.  Following the spirit
    ** of general ledger software that I worked on while in high school,
    ** closing sums up all of the transactions during the year and creates
    ** a new Beginning Balance, named 00, file into next year's direction ../YY+1/00
    **
    ** The Beginning Balance file has an entry for each account's amount.
    ** For example, 
    ** - 0000,101,15192.21,Balance Forward
    **   - 0000 This is a date field.  All zeros means beginning balance
    **   - 101  This is an account number.  Its meaning is found in the chart file
    **   - 15192.21 is a dollar amount equal to the balance of this account
    **   - Balance Forward.  This is a comment/description field
    ** The close script goes through all of the current year's financial 
    ** transaction files (01, 02, 03, ..., 12), sums up all the puts and takes
    ** for each account number, with the sum totals written to the 00 file.
    ** The amounts can be positive or negative.  The sum of all the amounts in
    ** the beginning balance file, 00, add up to zero.  :
    **
    ** Capital Accounts.  For account numbers between 100 and 500, these are 
    ** balance sheet accounts.  E.g Checking account, loan amounts, etc
    **
    ** PNL Accounts.  For account numbers in the 6xx-7xx range, these are expense
    ** accounts (gas, groceries, movies, etc).  The 8xx range is for income 
    ** (paycheck, dividends, interest, refunds).
    ** 
    ** The 00 file only has capital accounts.  The close program sums all the 
    ** income/expenses puts the total into an Income Summary account.  The 00 file
    ** has no PNL accounts, by design.
    **
    ** The close workflow:  4 steps
    ** 1. Create next year's directory:  if current year is 05, create a new 
    **    06, and create a ../06/chart file, based on the file 05/chart.  
    **    The server side php script mkchart.php does this.  It will only
    **    let itself run once.
    ** 2. Create next year's beginning Balance file, ../06/new00.  The server
    **    script file close.php does this.  It is meant to be run multiple
    **    times.  It does not over write the 00 file, it creates new00.
    ** 3. A manual, visual check needs to be done.  A server side 
    **    - diff new00 00
    **    script is run.  You need to look at the output and make sure that
    **    only things that changed are expected.
    ** 4. Copy new00 00.  For the last step, the new00 file should overwrite
    **    the 00 file.
    **
    ** The following functions execute each step of the workflow above.  The steps
    ** are manual, and each must be invoked through button press.
    *
    */

    $("#contentJournal").hide();

    $closeHtml = "\
<button id=buttonMkchart>Mkchart</button>\
<div id=mkchart></div>\
<button id=buttonClose>Close</button>\
<div id=close></div>\
<button id=buttonDiffnew00>Diffnew00</button>\
<div id=diffnew00></div>\
<button id=buttonCopynew00>Copynew00</button>\
<div id=copynew00></div>";
    $("#contentReport").html($closeHtml);

    $( "#buttonMkchart,#buttonClose,#buttonDiffnew00,#buttonCopynew00" ).button().click( function (event) {
        buttonID = this.id;
        messageID = this.nextSibling.id;
        messageObj = $("#"+messageID);
        console.log("buttonID-"+buttonID+" messageID-"+messageID+"\n");
        runCloseCommands(buttonID, messageID, messageObj);
    });
    $("#contentReport").show();
    $("#menuESC").show();


};


    JS.arCloseCommands = ["mkchart", "close", "diffnew00", "copynew00"];

/* Report->Close run close remote execution scripts:
** - mkchart -- runs mkchart.php script on the server to create
**              a chart of accounts file for the next year,
**              creating ../nf/YY+1/chart
** - close   -- runs the close.php sricpt to close the current
**              years finances and create a new beginning balance
**              file, named new00, for next year's finances directory
**              creating ../nf/YY+1/new00
** - diffnew00 -- runs the diff.php script.  It compares next years
**              new beginning balance file with the existing file
**              returning the results of diff.php ../nf/YY+1/new00 and ../nf/YY+1/00
** - copynew00 -- runs a php copy function 
**              copying ../nf/YY+1/new00 to ../nf/YY+1/00
**
** This function is an event attached to the web page off of the close menu.
** It checks to see which button is pressed and remotely runs one of the above
** scripts on the server.
*/
function runCloseCommands(buttonID, messageID, messageObj) {

    /* Validate messageID */
    if ($.inArray(messageID, JS.arCloseCommands)== -1 ) {
        console.log("runCloseCommands:  unrecognized messageID-"+messageID+"\n");
        return;
    } else { 
        console.log("runCloseCommands: "+messageID+" button clicked\n");
        CloseCommand = messageID;
    }

    /* For rest GET URL */
    CloseCommandRestGet = JS.jefileRestURI + JS.year + '/';
    CloseCommandRestGet += CloseCommand;

    /* Logging */
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Report->Close. Remotely executing "+CloseCommand;
    JS.logHtml += "</pre></td></tr></tbody>";

    $.blockUI({ message: '<h4><img src="images/busy.gif" /> running '+CloseCommand+' ...  </h4>' });

    $.ajax({"url":CloseCommandRestGet,
        "type":"GET",
        "dataType":"text"})
        .always( function(arg1, textStatus, arg3 ) {
        // on fail: always( function(jqXHR, textStatus, err ) { and textStatus != "success"
        // on done: always( function(err, textStatus, jqXHR ) { and textStatus == "success"
            console.log("First Always function. textStatus="+textStatus+"\n");
        }) /* end always (top) */
        .done( function(data, textStatus, jqXHR) {
            /* Close Command runs successfully.  Returns following message. */
            message = /message=[^"\r\n]*/.exec(data); 
            messagenkw = message[0].replace(/^message=/, '');;
            messageObj.append("<pre>"+messagenkw+"</pre>");

            if (CloseCommand == "diffnew00") {
                datanoretval = data.replace(/retval=.*$/m, '');
                datanoretval = datanoretval.replace(/count=.*$/m, '').trim();
                $("#diffnew00").html("<pre>"+datanoretval+"</pre>");
            }

            /* Logging */
            JS.logHtml += "<br>... run successful.";
            JS.logHtml += "<br>"+message;
            JS.logHtml += "<br>"+data;
            $("#statusfield").html(CloseCommand+" Done");


        }) /* end done: */
        .fail( function (jqXHR, textStatus, err) {
            /* Close Command returned an error */
            message = /message=[^"\r\n]*/.exec(jqXHR.responseText); 
            messagenkw = message[0].replace(/^message=/, '');;
            messageObj.append("<pre>"+messagenkw+"</pre>");
    
            /* Logging */
            console.log(CloseCommand+" run returned error", jqXHR.status,jqXHR.statusText);
            $("#statusfield").html(CloseCommand+" run Failed.");
            JS.logHtml += "<br>"+message;

        }) /* end fail */
        .always( function() { 
            $.unblockUI();
        }); /* End always */


} // end runCloseCommand

