
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

    $( "#buttonMkchart" ).button().click( function (event) {
        console.log("menuClose: Mkchart button clicked\n");
        //$("#contentReport").append("<br><div id=mkchart></div>");
        runmkchart();
    }).css("padding", ".1em .1em");
    $( "#buttonClose" ).button().click( function (event) {
        console.log("menuClose: Close button clicked\n");
        runclose();
    }).css("margin-top", "10px");
    $( "#buttonDiffnew00" ).button().click( function (event) {
        console.log("menuDiffnew00: Diffnew00 button clicked\n");
        rundiffnew00();
    }).css("margin-top", "10px");
    $( "#buttonCopynew00" ).button().click( function (event) {
        console.log("menuCopynew00: Copynew00 button clicked\n");
        runcopynew00();
    }).css("margin-top", "10px");
    $("#contentReport").show();
    $("#menuESC").show();


};



/* Report->Close run mkchart */
function runmkchart() {
    mkchartRestGET = JS.jefileRestURI + JS.year + '/mkchart';

    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Remotely executing mkchart<br>GET "+mkchartRestGET;
    start = new Date().getTime();
    $.blockUI({ message: '<h4><img src="images/busy.gif" /> running mkchart ...  </h4>' });

    $.ajax({"url":mkchartRestGET,
        "type":"GET",
        "dataType":"text",
        success: function(data) {
            JS.logHtml += "<br>... run successful.";
            message = /message=[^"\r\n]*/.exec(data); 
            JS.logHtml += "<br>"+message;
            JS.logHtml += "<br>"+data;
            $("#statusfield").html("mkchart run");

            message = message[0].replace(/^message=/, '');;
            $("#mkchart").html("<pre>"+message+"</pre>");

            
            end = new Date().getTime();
            diff = end - start;
              end = new Date().getTime();
            diff = end - start;
            JS.logHtml += "<br>... time "+ diff;
            JS.logHtml += "</pre></td></tr></tbody>";

            $.unblockUI();
            $("#statusfield").html("Mkchart Done");
            $("#menuESC").show();
        }, /* end success: */
        error: function (req, stat, err) {

            console.log("mkchart run returned error", req.status,req.statusText);
            $("#statusfield").html("mkchart run Failed.");
            //message = req.responseText.replace('/^.*message=([^"\r\n]*).*$/mi', $1);
            message = /message=[^"\r\n]*/.exec(req.responseText); 
            JS.logHtml += "<br>mkchart run returned error "+req.status+" "+req.statusText;
            JS.logHtml += "<br>"+message;
            JS.logHtml += "<br>"+req.responseText;
            JS.logHtml += "</pre></td></tr></tbody>";

            message = message[0].replace(/^message=/, '');;
            $("#mkchart").append("<pre>"+message+"</pre>");
            //$("#mkchart").append("<pre>"+req.responseText+"</pre>");
            $.unblockUI();

        } /* end error: */
    });


} // end run mkchart

/* Report->Close run close */
function runclose() {
    closeRestGET = JS.jefileRestURI + JS.year + '/close';

    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Remotely executing close<br>GET "+closeRestGET;
    start = new Date().getTime();
    $.blockUI({ message: '<h4><img src="images/busy.gif" /> running close ...  </h4>' });

    $.ajax({"url":closeRestGET,
        "type":"GET",
        "dataType":"text",
        success: function(data) {
            JS.logHtml += "<br>... run successful.";
            message = /message=[^"\r\n]*/.exec(data); 
            JS.logHtml += "<br>"+message;
            JS.logHtml += "<br>"+data;
            $("#statusfield").html("close run");

            message = message[0].replace(/^message=/, '');;
            $("#close").html("<pre>"+message+"</pre>");

            
            end = new Date().getTime();
            diff = end - start;
              end = new Date().getTime();
            diff = end - start;
            JS.logHtml += "<br>... time "+ diff;
            JS.logHtml += "</pre></td></tr></tbody>";

            $.unblockUI();
            $("#statusfield").html("Close Done");
            $("#menuESC").show();
        }, /* end success: */
        error: function (req, stat, err) {

            console.log("close run returned error", req.status,req.statusText);
            $("#statusfield").html("close run Failed.");
            //message = req.responseText.replace('/^.*message=([^"\r\n]*).*$/mi', $1);
            message = /message=[^"\r\n]*/.exec(req.responseText); 
            JS.logHtml += "<br>close run returned error "+req.status+" "+req.statusText;
            JS.logHtml += "<br>"+message;
            JS.logHtml += "<br>"+req.responseText;
            JS.logHtml += "</pre></td></tr></tbody>";

            message = message[0].replace(/^message=/, '');;
            $("#close").append("<pre>"+message+"</pre>");
            //$("#close").append("<pre>"+req.responseText+"</pre>");
            $.unblockUI();

        } /* end error: */
    });


} // end run close

/* Report->Close run Diffnew00 */
function rundiffnew00() {
    diffnew00RestGET = JS.jefileRestURI + JS.year + '/diffnew00';

    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Remotely executing diffnew00<br>GET "+diffnew00RestGET;
    start = new Date().getTime();
    $.blockUI({ message: '<h4><img src="images/busy.gif" /> running diffnew00 ...  </h4>' });

    $.ajax({"url":diffnew00RestGET,
        "type":"GET",
        "dataType":"text",
        success: function(data, textStatus, xhr) {
            JS.logHtml += "<br>... run successful.";
            message = /message=[^"\r\n]*/.exec(data); 
            JS.logHtml += "<br>"+message;
            JS.logHtml += "<br>"+data;
            $("#statusfield").html("diffnew00 run");

            message = message[0].replace(/^message=/, '');;
            datanoretval = data.replace(/retval=.*$/m, '');
            datanoretval = datanoretval.replace(/count=.*$/m, '').trim();
            $("#diffnew00").html("<pre>"+datanoretval+"</pre>");

            
            end = new Date().getTime();
            diff = end - start;
              end = new Date().getTime();
            diff = end - start;
            JS.logHtml += "<br>... time "+ diff;
            JS.logHtml += "</pre></td></tr></tbody>";

            $.unblockUI();
            $("#statusfield").html("diffnew00 Done");
            $("#menuESC").show();
        }, /* end success: */
        error: function (req, stat, err) {

            console.log("diffnew00 run returned error", req.status,req.statusText);
            $("#statusfield").html("diffnew00 run Failed.");
            //message = req.responseText.replace('/^.*message=([^"\r\n]*).*$/mi', $1);
            message = /message=[^"\r\n]*/.exec(req.responseText); 
            JS.logHtml += "<br>diffnew00 run returned error "+req.status+" "+req.statusText;
            JS.logHtml += "<br>"+message;
            JS.logHtml += "<br>"+req.responseText;
            JS.logHtml += "</pre></td></tr></tbody>";

            message = message[0].replace(/^message=/, '');;
            $("#diffnew00").append("<pre>"+message+"</pre>");
            //$("#diffnew00").append("<pre>"+req.responseText+"</pre>");
            $.unblockUI();

        } /* end error: */
    });


} // end run diffnew00

/* Report->Close run Copynew00 */
function runcopynew00() {
    copynew00RestGET = JS.jefileRestURI + JS.year + '/copynew00';

    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Remotely executing copynew00<br>GET "+copynew00RestGET;
    start = new Date().getTime();
    $.blockUI({ message: '<h4><img src="images/busy.gif" /> running copynew00 ...  </h4>' });

    $.ajax({"url":copynew00RestGET,
        "type":"GET",
        "dataType":"text",
        success: function(data, textStatus, xhr) {
            JS.logHtml += "<br>... run successful.";
            message = /message=[^"\r\n]*/.exec(data); 
            JS.logHtml += "<br>"+message;
            JS.logHtml += "<br>"+data;
            $("#statusfield").html("copynew00 run");

            message = message[0].replace(/^message=/, '');;
            $("#copynew00").html("<pre>"+message+"</pre>");

            
            end = new Date().getTime();
            diff = end - start;
              end = new Date().getTime();
            diff = end - start;
            JS.logHtml += "<br>... time "+ diff;
            JS.logHtml += "</pre></td></tr></tbody>";

            $.unblockUI();
            $("#statusfield").html("copynew00 Done");
            $("#menuESC").show();
        }, /* end success: */
        error: function (req, stat, err) {

            console.log("copynew00 run returned error", req.status,req.statusText);
            $("#statusfield").html("copynew00 run Failed.");
            //message = req.responseText.replace('/^.*message=([^"\r\n]*).*$/mi', $1);
            message = /message=[^"\r\n]*/.exec(req.responseText); 
            JS.logHtml += "<br>copynew00 run returned error "+req.status+" "+req.statusText;
            JS.logHtml += "<br>"+message;
            JS.logHtml += "<br>"+req.responseText;
            JS.logHtml += "</pre></td></tr></tbody>";

            message = message[0].replace(/^message=/, '');;
            $("#copynew00").append("<pre>"+message+"</pre>");
            //$("#copynew00").append("<pre>"+req.responseText+"</pre>");
            $.unblockUI();

        } /* end error: */
    });


} // end run copynew00
