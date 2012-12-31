
/* Report->Aarpt */
function dialogAarptSubmit() {
    /*
    ** The Aarpt report queries the Journal Entry files starting from
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

    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Generating Aarpt Report for year-"+JS.year+"<br>GET "+jefileRestGET;
    start = new Date().getTime();
    $.blockUI({ message: '<h4><img src="images/busy.gif" /> Loading ...  </h4>' });

    $.ajax({"url":jefileRestGET,
        "type":"GET",
        "dataType":"json", 
        success: function(data) {
            JS.logHtml += "<br>... received "+data.length+" bytes.";
            JS.nfyy = data;

            $("#statusfield").html("Aarpt Loaded");
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

            $("#statusfield").html("Aarpt Generating");
            JS.logHtml += "<br>... generating report";
            rep = AarptReportHtml();
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
            $("#statusfield").html("Aarpt Done");
            $("#menuESC").show();
        }, /* end success: */

        error: function (req, stat, err) {
            console.log("analdtl load failed", req.status,req.statusText);
            JS.logHtml += "<br>analdtl load failed "+req.status+" "+req.statusText+" "+err;
            JS.logHtml += "<br>Aarpt-"+JS.year+"/?? Load failed.";
            JS.logHtml += "</pre></td></tr></tbody>";
            $.unblockUI();
            $("#statusfield").html("Aarpt Load Failed.");
        } /* end error: */
    });


    $("#statusfield").html("Aarpt...");

};

/*
** Generate Aarpt Report
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
function AarptReportHtml() {
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
var totmon = 0, totmondr = 0, totmoncr = 0,
    totacct = 0, totacctdr = 0, totacctcr = 0,
    tota12 = 0, tota12dr = 0, tota12cr = 0,
    tota11 = 0, tota11dr = 0, tota11cr = 0,
    grand = 0, granddr = 0, grandcr = 0;

/* Historical name:  car
** - content addressable array table
** car["101"] holds the sum of all 101 je entries
** car["1"] holds sum of all entries where the account number starts with 1
*/

var car = {};

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
** Aarpt private functions. 
************************************
*/


/* Helper function for adding lines to rep string */
var dispTabEntHtml = function(line) {
    return "<tbody class=\"displayTableEntry\"><tr><td><pre>" + line + "</pre></td></tr></tbody>";
}

var aadtl = function(acct1,acct2) {
    aasdtl(acct1,acct2,CHlookup(acct1))
}

var aasdtl = function(acct1,acct2,acctname) {
    if (car[acct1] === undefined) {
        caracct1 = 0;
    } else {
        caracct1 = car[acct1];
    }
    if (car[acct2] === undefined) {
        caracct2 = 0;
    } else {
        caracct2 = car[acct2];
    }
    reportline += sprintf("%-3.3s/%-3.3s %-30.30s %10.2f %10.2f\n", 
                acct1,acct2,acctname,caracct1,caracct2);
}

var aacrdtl = function(acct1,acct2) {
    if (car[acct1] != 0 || car[acct2] != 0) {
        aadtl(acct1,acct2);
    }
}

var aa1dtl = function(acct1,acctname){
    if (car[acct1] !== undefined && car[acct1] != 0) {
        reportline += sprintf("%-3.3s     %-30.30s %10.2f\n", acct1, acctname, car[acct1]);
    }
}

var prtab2 = function(label1,amt1,label2,amt2) {
        /*
        ** Print table assistant function.
        ** 1.  print label withing 20 characters.
        ** 2.  round long int to nearest whole (assume 2 dec places)
        ** 3.  print amt in 7 characters (blank if zero)
        */

        var lamt1,lamt2;
        lamt1 = ((amt1+50)/100);
        lamt2 = ((amt2+50)/100);

        reportline += sprintf("%-20.20s",label1);
        if (amt1 != 0) {
                reportline += sprintf("%7d  ",lamt1);
        }
        else {
                reportline += sprintf("         ");
        }

        reportline += sprintf("%-20.20s",label2);
        if (amt2 != 0) {
                reportline+= sprintf("%7d\n",lamt2);
        }
        else {
                reportline += sprintf("       \n");
        }
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
} /* return GLnewheads */

/*
** The account number should always be found in the JS.chart[] data structure
** If not, we want to tag with an error message
*/
var CHlookup = function(acct) {
    var chartdesc = "";
    if (JS.chart[acct] !== undefined && JS.chart[acct] !== undefined) {
        chartdesc = JS.chart[acct].chDesc;
    } else {
        chartdesc = "** Invalid Code **";
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

        totacct += totmon;
        totacctdr += totmondr;
        totacctcr += totmoncr;
        totmon = 0;
        totmondr = 0;
        totmoncr = 0;

        curmon = sgline.mmdd.substring(0,2);
    }

    /* Process change in account number */
    if (acct_chgd) {

        tota12 += totacct;
        tota12dr += totacctdr;
        tota12cr += totacctcr;

        if (car[curacct] === undefined) {
            car[curacct] = 0;
        }
        car[curacct] += totacct;

        totacct = 0;
        totacctdr = 0;
        totacctcr = 0;

        curacct = sgline.acct;
    }

    /* Process change in first two digits in account number */
    if (a12_chgd) {

        tota11 += tota12;
        tota11dr += tota12dr;
        tota11cr += tota12cr;

        if (car[cura12] === undefined) {
            car[cura12] = 0;
        }
        car[cura12] += tota12;

        tota12 = 0;
        tota12dr = 0;
        tota12cr = 0;

        cura12 = sgline.acct.substring(0,2);
    }

    /* Process change in first two digits in account number */
    if (a11_chgd) {

        grand += tota11;
        granddr += tota11dr;
        grandcr += tota11cr;

        if (car[cura11] === undefined) {
            car[cura11] = 0;
        }
        car[cura11] += tota11;

        tota11 = 0;
        tota11dr = 0;
        tota11cr = 0;

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
    if (amt < 0) {
        totmoncr += amt;
    } else {
        totmondr += amt;
    }

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
/***
    reportline = sprintf("    %s/%s   %10.2f %-30.30s",
                         sgline.mmdd.substring(0,2),
                         sgline.mmdd.substring(2),
                         parseFloat(sgline.amt),
                         sgline.desc);

    rep += dispTabEntHtml( reportline );

***/
}

/* generate one last control break and print grand total */
var GLfinals = function() {

    /* force subtotals for all report levels */
    sgline = {mmdd: "9999", acct: "999", amt: "9999.99"};
    GLctrlbrk(sgline);
    GLsubtotals(sgline);

    reportline  = sprintf("---------------------- SAVINGS ACCOUNTS----------------------\n");
    reportline += sprintf("ACCOUNT %-30.30s     AMOUNT   INTEREST\n","NAME");

        /* Bank accounts and interest */
console.log(car);
   aacrdtl("101","822");
   aacrdtl("105","826");
   aacrdtl("111","823");
   aacrdtl("112","821");
   aacrdtl("115","824");
   aacrdtl("113","834");
   aacrdtl("116","835");

   car["12x"] = car["126"] + car["127"];
   aasdtl("12x","837","ESOP JPK+CEK");

   aadtl("117","836");




    reportline += sprintf("\n-------------------INVESTMENT PORTFOLIO---------------------\n");
        /* IRAs */
   aacrdtl("231","861");
   aacrdtl("232","862");
   aacrdtl("235","868");
   aacrdtl("236","869");

    reportline += sprintf("\n");

        /* CMA */
        aa1dtl("128","Mutual Funds");
        aa1dtl("260","CMA Others");
        aa1dtl("261","CMA Equities");
        aa1dtl("262","CMA Mutual Funds");



                /* BSSPs */
        reportline += sprintf("\n        %-30.30s        JPK        CEK\n","");
        aasdtl("121","122","Company Savings ");
        aasdtl("233","234","Company 401K ");




        /* Loan/charge balances and finance charge */
    reportline += sprintf("\n-------------------LOANS AND CREDIT CARDS-------------------\n");
    reportline += sprintf("ACCOUNT %-30.30s     BALANCE   FINANCE\n","NAME");
        aacrdtl("301","671");
        aacrdtl("302","672");
        aacrdtl("303","673");
        aacrdtl("304","671");
        aacrdtl("306","");
        aacrdtl("312","674");
        aacrdtl("313","67a");
        aacrdtl("314","679");
        aacrdtl("316","67c");
        aacrdtl("321","67d");
        aacrdtl("322","678");
        aacrdtl("323","67b");
        aacrdtl("324","67d");
    reportline += sprintf("\n");
        aacrdtl("404","648");
        aacrdtl("406","622");
        aacrdtl("412","642");
        aacrdtl("451","649");
    reportline += sprintf("\n");

        /* mortgage */
        aacrdtl("42","611");

        aasdtl("14","612","Escrow / Real Estate Taxes");
        aadtl("643","");
    reportline += sprintf("\n");

        /* Paycheck */
    reportline += sprintf("----------------------INCOME AND TAXES----------------------\n");
    reportline += sprintf("ACCOUNT %-30.30s        JPK        CEK\n","NAME");

        aadtl("801","811");
        aadtl("802","812");
        aadtl("803","813");
        aadtl("804","814");
        aadtl("807","817");
    reportline += sprintf("\n");




    reportline += sprintf("\n----------------------BALANCE SHEET----------------------\n");

        prtab2("ASSETS",0,"LIABILITIES",0);
        prtab2("  Cash/Savings",car["10"]+car["11"],
                "  Credit Cards",car["3"]);
   prtab2("  Investments",car["12"]+car["24"]+car["26"],"  Loans",
      car["40"]+car["41"]+car["45"]);
        prtab2("  Personal Property",car["20"],"  Mortgage",car["42"]);
   prtab2("  House",car["22"],"  Other",car["4"]-car["40"]-car["41"]-car["42"]-car["45"]);
        prtab2("  IRA/401(k]",car["23"],"  TOTAL",car["3"]+car["4"]);
   lamtc1s1=car["1"];
   lamtc1s1=lamtc1s1-car["10"]-car["11"]-car["12"];
   lamtc1s1=lamtc1s1+car["21"]-car["25"];

        prtab2("  Other",lamtc1s1,"",0);
        prtab2("  TOTAL",car["1"]+car["2"],"",0);

        lamtc1s1=car["1"];
        lamtc1s1=lamtc1s1+car["2"];
        lamtc1s1=lamtc1s1+car["3"];
        lamtc1s1=lamtc1s1+car["4"];
        prtab2("NET WORTH",lamtc1s1,"",0);
    reportline += sprintf("\n");

    reportline += sprintf("\n----------------------INCOME/EXPENSE----------------------\n");



        prtab2("INCOME",0,"EXPENSES",0);
        prtab2("  Gross",car["801"]+car["811"],"  Housing",
                car["61"]);
        prtab2("  401(k]",car["807"]+car["817"],"  Transportation",
                car["62"]);
        prtab2("  Interest/Dividend",car["82"]+car["83"],"  Food/Sundries",
                car["63"]);
        prtab2("  Nontaxable",car["86"],"  Medical",car["65"]);
        prtab2("  Other",0,"  Charity",car["643"]);
        lamtc1s1=car["801"];
        lamtc1s1=lamtc1s1+car["811"];
        lamtc1s1=lamtc1s1+car["807"];
        lamtc1s1=lamtc1s1+car["817"];
        lamtc1s1=lamtc1s1+car["82"];
        lamtc1s1=lamtc1s1+car["83"];
        lamtc1s1=lamtc1s1+car["86"];
        prtab2("  TOTAL",lamtc1s1,"  Finance Charges",car["67"]);
        prtab2("",0,"  Child Care",car["68"]);

        lamtc2s1=car["61"];
        lamtc2s1=lamtc2s1+car["62"];
        lamtc2s1=lamtc2s1+car["63"];
        lamtc2s1=lamtc2s1+car["65"];
        lamtc2s1=lamtc2s1+car["67"];
        lamtc2s1=lamtc2s1+car["68"];
        lamtc2s1=lamtc2s1+car["643"];
        lamtc2s1=car["6"]-lamtc2s1;
        prtab2("",0,"  Other",lamtc2s1);



    rep += dispTabEntHtml( reportline );

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

} /* end AarptReportHtml */
