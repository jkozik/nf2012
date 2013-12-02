
/* Report->Glrpt */
function dialogGlrptSubmit() {
    /*
    ** The Glrpt report queries the Journal Entry files starting from
    ** the beginning of the year.  All JEs are decomposed into separate
    ** items (MMDD,Acct,Amt,Descriptions) referred to as PGLs.  The PGLs
    ** are sorted by Acct and MMDD and stored in a SGL array.
    ** The output is a General Ledger report with subtotals for XXX, XX, 
    ** X positions of the Acct field.  This report is long.
    */

   
    /*
    ** The following REST query gets all the monthly Journal files
    ** for the current year.  If January, this is one file; if it is December, 
    ** then 12 files.  On the server the files are stored at the following 
    ** path:   ../nf/YY/MM
    ** where YY is current year (e.g. 11 for 2011)
    **       MM is current month (e.g. 06 for June)
    **
    ** the REST query returns a JSON formated data structure that maps
    ** each of the months into an element of a content array:
    ** ../nf/05/11 -> JS.nfyy["11"].jefile[]
    ** The JS.nfyy content array expect to hold no more than 12 months worth
    ** of data.  The application does not span year boundaries.
    */

    jefileRestGET = JS.jefileRestURI + JS.year;

    $.blockUI({ message: '<h4><img src="images/busy.gif" /> Loading ...  </h4>' });

    /* Logging Report->Glrpt */
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Generating Glrpt Report for year-"+JS.year;
    JS.logHtml += "</pre></td></tr></tbody>";


    $.ajax({
      url: jefileRestGET,
      type: "GET",
      dataType: "json"
    })
      .done(function( response, textStatus, jqXHR ) {
        JS.logHtml += "<br>... received "+jqXHR.responseText.length+" bytes.";
        JS.nfyy = response;

        $("#statusfield").html("Glrpt Loaded");
        JS.logHtml += "<br>... sorting data";
        /*
        ** Input: JS.nfyy["01" - "12"]
        ** Output: JS.nfyy["00.pgl" - "12.pgl"]
        */
        console.log("about to call transformMMtoPGL()");
        transformMMtoPGL();

        /* Log XX.pgl record counts */
        MMcnt = "<br>... MM / Count";
        $.each(JS.nfyy, function (key,value) {
            if(key.length==2){
                MMcnt += "<br>    "+key+" / "+value.length;
            }
        });
        JS.logHtml += MMcnt;

        /*
        ** Input: JS.nfyy["00.pgl" - "12.pgl"]
        ** Output: JS.nfyy["00to12.sgl"]
        ** - sorted by acct, mmdd
        */
        sortPGLtoSGL();

        $("#statusfield").html("Glrpt Generating");
        JS.logHtml += "<br>... generating report";
        rep = GlrptReportHtml();
        /* rep = AnaldtlReportHtml("304"); */


        end = new Date().getTime();
        diff = end - start;
        JS.logHtml += "<br>... time "+ diff;
        JS.logHtml += "</pre></td></tr></tbody>";

        $("#contentJournal").hide();
        $("#contentReport").html(""+rep+"");
        JS.report.cnt = $("#report tbody").length;
        JS.report.curidx = JS.report.cnt-1;
        $("#report .displayTableEntry:last").addClass("displayTableEntryhighlight");
        /* All TOTAL lines are bold */
        $("#report tbody tr td:contains(TOTAL)").css("font-weight","900")

        $("#contentReport").show();
        $('html, body').animate({ scrollTop: $(document).height()}, 750);

        $.unblockUI();
        $("#statusfield").html("Glrpt Done");
        $("#menuESC").show();
      })
      .fail(function( jqXHR, textStatus, errorThrown ) {
        console.log("Glrpt load failed");
        JS.logHtml += "<br>Glrpt-"+JS.year+"/?? Load failed.";

        $.unblockUI();
        $("#statusfield").html("Glrpt Load Failed.");
      });





    $("#statusfield").html("Glrpt...");

};

/*
** Generate Glrpt Report
** - Input: JS.nfyy["00to12.sgl"].pglfile[i] 
**
** - Output:  HTML neatly formated report with totals and subtotals
**
** The report is formatted like the General Ledger report that we worked
** with at St Charles Manufacturing.  The company ran "Trial Balances" of
** the General Ledger at the close of each month/quarter and year.
**
** The account numbers are defined in a chart of account file named chart.
** It is loaded from the server in the JS.chart array of objects.
** The chart file is keyed by account number and it returns a description.
** E.g. "101" - "Gary-Wheaton Checking".  The account number is three digits
** and all financial transaction that add or subtract from GWB Checking use
** the account number "101".  
**
** The account number's first two digits signify chart of account categories.
**  - "1"   - ASSETS-WORKING
**  - "10"  - Cash
**  - "101" - Gary-Wheaton Checking
**
** That is the 101 account is a Cash account within the ASSETS-WORKING balance sheet** account. Financial transactions are only done using 3 digit account numbers.  
** In other words, you will never see a credit card paid from the "10" Cash account.
** A credit card will always be paid from a 3 digit account number that begins
** with 10X (e.g. 101 - Gary-Wheaton Checking).
**
** The object of the report is to collect all of the accounting transactions for each
** The report takes all the finanical transactions for the year and sorts by
** account number.  Within each account number the items are sorted by date.
** The report prints each transaction with totaling by month, by account (XXX),
** by minor (XX-) and major (X--) account categories.
** 
** For completeness, there's also a grand total; by definition, the grand total
** of all the accounts in a General Ledger add to zero.  Historically, a couple
** of years had some round error glitches and the sum is 0.04.  I should
** fix this.
**
** The output is a great big huge HTML-tagged string with reportlines formatted
** to be tbody style entries, .displayTableEntry, in a #report table. 
** This nicely fits in the #container/#contentReport div.
*/
function GlrptReportHtml() {
var i, j, k;
var monamt = 0;
var monrcnt = 0;
var runamt = 0;
var lamt = 0;
var pglfile = null;
var reportline = "";
var rep = "<table id=report>";
//var acctinp = $("input#dialoginp").val()
var acctinp = "101";  // temporary, delete when done
var SubAcct = {};

/* Current Report Level Data */
var curmon = "",
    curacct = "",
    cura12 = "",
    cura11 = "";

/* Total accumulators */
var totmon = 0,
    totacct = 0,
    tota12 = 0,
    tota11 = 0,
    grand = 0;

/* Report Level Changed Flags */
var mon_chgd = false,
    acct_chgd = false,
    a12_chgd = false,
    a11_chgd = false,
    head_prt = false;

/* Report audit counts and sums */
var balshtcnt = 0, balshtdr = 0, balshtcr = 0;
var expcnt = 0, expdr = 0, expcr = 0;
var inccnt = 0, incdr = 0, inccr = 0;



/*
************************************
** Glrpt private functions. 
************************************
*/


/* Helper function for adding lines to rep string */
var dispTabEntHtml = function(line) {
    return "<tbody class=\"displayTableEntry\"><tr><td><pre>" + line + "</pre></td></tr></tbody>";
}

/*
** Report Controls month, account, minor and major account categories.
**
** A control break is whenever a control changes.  Important reporting logic:
** if any control changes, less controls, by implication also changes.
** If an account changes, the we also want to indicate that the month changed,
** even though it is possible that the next record with a new account has
** an unchanged month.
**
** - input: cura11, cura12, curacct, curmon, sgline
** - output: a11_chgd, a12_chgd, acct_chgd, mon_chgd
*/
var GLctrlbrk = function(sgline) {
    mon_chgd = false;
    acct_chgd = false;
    a12_chgd = false;
    a11_chgd = false;

    /* Check for change in 1st acct digit */
    if ( sgline.acct[0] != cura11 ) {
        mon_chgd = true;
        acct_chgd = true;
        a12_chgd = true;
        a11_chgd = true;

    /* Check for change in 2rd acct digit */
    } else if ( sgline.acct.substring(0,2) != cura12 ) {
        mon_chgd = true;
        acct_chgd = true;
        a12_chgd = true;

    /* Check for change in acct */
    } else if ( sgline.acct != curacct ) {
        acct_chgd = true;
        mon_chgd = true;

    /* Check for change in month */
    } else if ( sgline.mmdd.substring(0,2) != curmon ) {
        mon_chgd = true;
    }
    return mon_chgd;
}

/*
** Print headings at the beginning of new accounts or account categories
** - input: a11_chgd, a12_chgd, acct_chgd, 
** - output: add a total line to the rep string
*/
var GLnewheads = function() {
    /* Print out heading for change in first digit in acct (a11) */
    if (a11_chgd) {
        a11_chgd = false;
        reportline = sprintf("%.1s   %-30.30s",cura11,CHlookup(cura11));
        rep += dispTabEntHtml( "  " );
        rep += dispTabEntHtml( reportline );
    }


    /* Print out heading for change in first two digits in acct (a12) */
    if (a12_chgd) {
        a12_chgd = false;
        reportline = sprintf("%.2s  %-30.30s",cura12,CHlookup(cura12));
        rep += dispTabEntHtml( "  " );
        rep += dispTabEntHtml( reportline );
    }


    /* Print out heading for change in account */
    if (acct_chgd) {
        acct_chgd = false;
        reportline = sprintf("%.3s %-30.30s",curacct,CHlookup(curacct));
        rep += dispTabEntHtml( reportline );
    }

} /* return GLnewheads */

/*
** The account number should always be found in the JS.chart[] data structure
** If not, we want to tag with an error message
*/
var CHlookup = function(acct) {
    var chartdescobj = JS.chart[acct];
    if (chartdescobj === undefined) {
        chartdesc = "** Invalid Code **";
    } else {
        chartdesc = chartdescobj.chDesc;
    }
    return chartdesc;
}

/*
** If any report controls changed, we need to give subtotals.
** The logic to decide which subtotals to give is located in GLctrlbrk()
** - input: mon_chgd, acct_chgd, a12_chgd, a11_chgd, sgline
** - output:  add total line to rep, update accumulators: totmon, totacct, tota12, tota11, grand
*/
var GLsubtotals = function(sgline) {

    /* Process change in month */
    if (mon_chgd) {
        if(head_prt) {
            reportline = sprintf("    TOT %s  %10.2f*", curmon, totmon);
            rep += dispTabEntHtml( reportline );
        }
        if (curacct[0] >= "6" || acct_chgd) {
            totacct += totmon;
            totmon = 0;
        }

        curmon = sgline.mmdd.substring(0,2);
    }

    /* Process change in account number */
    if (acct_chgd) {
        if (head_prt) {
            reportline = sprintf("%.3s TOTAL %-30.30s %10.2f**",curacct,CHlookup(curacct),totacct);
            rep += dispTabEntHtml( reportline );
        }
        tota12 += totacct;
        totacct = 0;
        curacct = sgline.acct;
    }

    /* Process change in first two digits in account number */
    if (a12_chgd) {
        if (head_prt) {
            reportline = sprintf("%.2s  TOTAL %-30.30s %10.2f***\n",cura12,CHlookup(cura12),tota12);
            rep += dispTabEntHtml( reportline );
        }
        tota11 += tota12;
        tota12 = 0;
        cura12 = sgline.acct.substring(0,2);
    }

    /* Process change in first two digits in account number */
    if (a11_chgd) {
        if (head_prt) {
            reportline = sprintf("%.1s   TOTAL %-30.30s %10.2f****\n",cura11,CHlookup(cura11),tota11);
            rep += dispTabEntHtml( reportline );
        }
        grand += tota11;
        tota11 = 0;
        cura11 = sgline.acct[0];
    }

    head_prt = true;

}

/*
** Every financial transaction record is printed.  The amount is summed.
** - input: sgline and accumulators:  totmon
** - output: detail line is appended to rep string
*/
var GLprtdtl = function(sgline) {
    var amt = parseFloat(sgline.amt);
    var acct = sgline.acct;

    totmon += amt;
    if (acct[0] < "6") {
        balshtcnt++;
        if (amt < 0) {
            balshtcr += amt;
        } else {
            balshtdr += amt;
        }

     } else if (acct[0] == "6" || acct[0] == "7") {
        expcnt++;
        if (amt < 0) {
            expcr += amt;
        } else {
            expdr += amt;
        }

     } else if (acct[0] == "8") {
        inccnt++;
        if (amt < 0) {
            inccr += amt;
        } else {
            incdr += amt;
        }
     }

    /* Don't print checking account and petty cash transactions.  TOo many! */
    if (curacct == "101" || curacct == "104") {
        return;
    }

    /* Print detail line */
    reportline = sprintf("    %s/%s   %10.2f %-30.30s",
                         sgline.mmdd.substring(0,2),
                         sgline.mmdd.substring(2),
                         parseFloat(sgline.amt),
                         sgline.desc);

    rep += dispTabEntHtml( reportline );

}

/* generate one last control break and print grand total */
var GLfinals = function() {

    /* force subtotals for all report levels */
    sgline = {mmdd: "9999", acct: "999", amt: "9999.99"};
    GLctrlbrk(sgline);
    GLsubtotals(sgline);

    /* print grand total */
    reportline = sprintf("    %-30.30s       %10.2f****","GRAND TOTAL",grand);
    rep += dispTabEntHtml( reportline );
    rep += dispTabEntHtml( "   " );

    /* print audit counts and sums */
    reportline = sprintf("\n               Counts    ------- Amount --------\n");
    reportline += sprintf("                          Debit        Credit\n");
    reportline += sprintf("Balance Sheet    %4d  %11.2f   %11.2f   %11.2f*\n", balshtcnt, balshtdr, balshtcr, balshtdr+balshtcr);
    reportline += sprintf("Expense          %4d  %11.2f   %11.2f   %11.2f*\n", expcnt, expdr, expcr, expdr+expcr);
    reportline += sprintf("Income           %4d  %11.2f   %11.2f   %11.2f*\n", inccnt, incdr, inccr, incdr+inccr);

    grandsum = balshtdr+balshtcr + expdr+expcr + incdr+inccr;
    granddr  = balshtdr + expdr + incdr;
    grandcr  = balshtcr + expcr + inccr;
    grandcnt  = balshtcnt + expcnt + inccnt;
    reportline += sprintf("                 %4d* %11.2f*  %11.2f*  %11.2f**\n", grandcnt, granddr, grandcr, grandsum);


    rep += dispTabEntHtml( reportline );
}

/* 
** Main Loop
** For each financial transaction sorted into the JS.nfyy["00to12.sgl"] array
** - if report controls (month, account number) have changed
**   - print totals for the previous month/account
**   - print new headings for the new account
** 
** - sum the ammount and print the tranaction.
** Then finally, print the grand totals
*/
var len = JS.nfyy["00to12.sgl"].length;
for (i=1; i < len; i++) {
    sgline = JS.nfyy["00to12.sgl"][i];

    reportline = "";
    /* check if month or acct changed "Control Break" */
    if (GLctrlbrk(sgline)) {
        GLsubtotals(sgline);
        GLnewheads();
    }
    GLprtdtl(sgline);

}


GLfinals();
rep += "</table>";
return rep;

} /* end GlrptReportHtml */
