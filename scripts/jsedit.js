/*
** jsedit.js -- main application script.  Pulled in by index.html
*/


  jQuery.fn.log = function (msg) {
      console.log("%s: %o", msg, this);
      return this;
  };


/*
** Initialize global variables in JS namespace
*/
var JS = {};
JS.jefile = [];
JS.chart = [];
JS.jefileOpen = false;
JS.jefileChanged = false;
JS.recordsAdded = 0;
JS.recordsDeleted = 0;
JS.recordsChanged = 0;
JS.jecnt = 0;
JS.curidx = 0;
JS.report = {"cnt":null, "curidx":null};
JS.report.cnt = 0;
JS.report.curidx = 0;
JS.logHtml = "";
JS.nfyy = [];
JS.YankPutArray = [];
JS.YankPutArrayCnt = 0;
JS.searchinput="";   //default for Edit/Report Search
JS.analdtlinp="";    //default account for Report->Analdtl


/* Get query string parameters */
var urlParams = {};
(function () {
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

    while (e = r.exec(q))
       urlParams[d(e[1])] = d(e[2]);
})();

/* Detect which apache server:  kozik6 or kozik2 */
/*
** TEST vs PRODUCTION SERVER TEST
**
** http://kozikfamily.net 
** -- test environment
** -- server data /home/nf/public_html/nf/$year
** -- default year-05, mm-05
**
** https://cisco163.kozikfamily.net
** -- real, live environment
** -- server data c:\nf\$year
** -- default year and date based on today's date
*/
if (location.origin == "http://kozikfamily.net" ) {
    JS.jefileRestURI = "http://kozikfamily.net/rest/";
    JS.year = "05";
    JS.mm = "05";
} else if (location.origin == "https://cisco163.kozikfamily.net" ) {
    JS.jefileRestURI = "https://cisco163.kozikfamily.net/rest/";
} else {
    JS.jefileRestURI = window.location.origin + "/rest/";
/***
    JS.jefileRestURI = "http://kozikfamily.net/rest/";
    JS.year = "05";
    JS.mm = "05";
***/
}

//JS.year = "05";
//JS.year = "11";
currentYear = sprintf("%02s",new Date().getYear()-100);

console.log("urlParams[year]", urlParams["year"]);

if (urlParams["year"] !== undefined) {
    JS.year = urlParams["year"];
}
console.log("JS.year-", JS.year);


/* Set current month, JS.mm and currentMonth, based on today's date */

JS.months = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
var jefrec = {"mmdd":null, "cract":null, "cramt":null, "desc":null,
                     "acctamt": [{"acct":null, "amt":null }] };
currentMonth = new Date().getMonth()+1;
JS.mmfileinput = JS.months[currentMonth]; //default File menu dialog box
JS.mm = sprintf("%02s",currentMonth);
console.log("JS.mm-", JS.mm);




$(document).ready(function(){

/* Setup Journal Entry Display Table Templates */
//$("#page").append($("#journalTemplate").html());
/*******************
console.log("Loading jetmpl.hmtl file.  Should always work!(?)");
$.get('/jetmpl.html', function(data) {
    $('#page').append(data);
    JS.jetmpl = $("#jetmpl");
    JS.jeformtmpl = $("#jeformtmpl");
    console.log("jetmpl.html file loaded.  Should setup on JS.logHtml");
});
*******************/

/*
** Load /jetmpl.html
** -- templates for journal entry display and edit forms
*/
$("#contentJournal").append("<br>Loading /jetmpl.html");
JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
JS.logHtml += "<br>/jetmpl.html loading";
JS.logHtml += "</pre></td></tr></tbody>";
$.ajax({
    url:'/jetmpl.html',
    success: function(response) {
        $("#contentJournal").append("<br>/jetmpl.html load successful.");
        $('#page').append(response);
        JS.jetmpl = $("#jetmpl");
        JS.jeformtmpl = $("#jeformtmpl");

        /* Logging */
        console.log("jetmpl.html file loaded.  ");
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>/jetmpl.html load successful.";
        JS.logHtml += "</pre></td></tr></tbody>";
    },
    error: function (req, stat, err) {
        /* so if jetmpl.html doesn't load then not much works.  For now, just log it */
        /* Logging */
        console.log("jetmpl.html load failed", req.status,req.statusText);
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>/jetmpl.html load failed "+req.status+req.statusText;
        JS.logHtml += "</pre></td></tr></tbody>";
    }
});
    

/* Log base URL; watch for test, real, and SSL verions */
JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
JS.logHtml += "<br>JS.jefileRestURI-"+JS.jefileRestURI+"<br>location.href-"+location.href+"<br>JS.year-"+JS.year;
JS.logHtml += "</pre></td></tr></tbody>";

/* Load Chart of Accounts File for current year */


    chartRestGET = JS.jefileRestURI +JS.year+"/chart.json";
    //chartRestGET = JS.jefileRestURI +JS.year+"/chart";

    /* Logging */
    start = new Date().getTime();
    $("#contentJournal").append("<br>Loading Chart of Accounts<br>GET "+chartRestGET);
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Loading Chart of Accounts<br>GET "+chartRestGET;
    JS.logHtml += "</pre></td></tr></tbody>";

    $.blockUI({ message: '<h4><img src="images/busy.gif" /> Initializing ...  </h4>' });
    $.ajax({"url":chartRestGET,
        "type":"GET",
        //"dataType":"text", 
        "dataType":"json", 
        timeout: (2 * 1000),
        success: function(response) {
            $.unblockUI();
            /*
            ** Put response -> JS.chart
            */
            JS.chart = response;

            /* Logging */
            $("#contentJournal").append("<br>chart... received "+response.length+ " bytes");
            JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
            JS.logHtml += "<br>chart... received "+response.length+ " bytes";


            /* Logging */
            $("#contentJournal").append("<br>chart... parsed into "+JS.chart.length+ " enteries in JS.chart[]");
            JS.logHtml += "<br>chart... parsed into "+JS.chart.length+ " enteries in JS.chart[]";
            end = new Date().getTime();
            diff = end - start;
            $("#contentJournal").append("<br>chart... time "+ diff);
            JS.logHtml += "<br>chart... time "+ diff;
            JS.logHtml += "</pre></td></tr></tbody>";
            $("#statusfield").html("chart Loaded.");

        },
        error: function (req, stat, err) {
            console.log("chart load failed", req.status,req.statusText);
            JS.logHtml += "<br>chart load failed "+req.status+req.statusText;
            JS.logHtml += "</pre></td></tr></tbody>";
            $.blockUI({ message: '<h4> Init Timeout.<br>F5 to retry.</h4>' });
            $("#statusfield").html("chart Load Failed.");
        }
    });
    $("#statusfield").html("chart...");

/* Menu Events */





/* File->SaveAs */

$('#menuSaveAs').click(function(){
    console.log("menuSaveAs click function called");
    $("#foot").text("");
    if (JS.jefileOpen === false) {
        console.log("menuSaveAs:  nothing opened, nothing to save");
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>SaveAs: nothing opened, nothing to save";
        JS.logHtml += "</pre></td></tr></tbody>";
        $("#foot").text("Save As: Nothing Opened. Nothing to Save.");
        return;
    } else if (JS.jefileOpen === true && JS.jefileChanged === false) {
        console.log("menuSaveAs:  file opened but nothing has changed, no save" );
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>SaveAs: file opened but nothing has changed, no save";
        JS.logHtml += "</pre></td></tr></tbody>";
        $("#foot").text("Save As: File Opened. Nothing has changed, no Save.");
        return;
    }
    if ($("#menuESC").is(":visible")){
        $("#menuESC").click();
    }
    /* File->SaveAs, JE File Dialog Box */
    if ($("#dialog").length>0) {
        $("#dialog").dialog("close");
    }
    JS.dialog = $("#dialogTemplate")
        .tmpl({size: "2", def: JS.mmfileinput, label: "Enter File Name:"})
        .dialog({
	    modal:true, 
	    title: "Save As",
	    buttons: { "OK": function(){ $(this).trigger('submit'); }},
            close: function(ev, ui) { $(this).remove(); }
		
        }).submit(function(){ dialogSaveAsSubmit(); });

});


 
/* File->SaveAs */
//$("#dialogSaveAs").submit(function() {
function dialogSaveAsSubmit() {
    /*
    ** The SaveAs file name, mm, must be 01-12 with the default equal to the currently open month JS.mm
    */
    //mm = $("input#dialogSaveAsinp").val();
    mm = $("input#dialoginp").val();
	
    if (mm.length < 2 || mm < '01' || mm > '12') {
        $("#dialogError").text("File 01-12 only").show();
        return false;
	
    }
    JS.mmfileinput = mm;  // default for next File menu dialog box
    if (JS.mm != mm) {
        // the mmdd field needs to be updated
        JS.mm = mm;
    }
    $("#menuSave").click();
    $("#dialog").dialog('close');
//});
}


/* File->New */

$('#menuNew').click(function(){
    console.log("menuNew click function called");
    $("#foot").text("");
    if (JS.jefileOpen === true && JS.jefileChanged === true) {
        console.log("menuNew:  file already opened and has changed, need to prompt to save");
    }
    if ($("#menuESC").is(":visible")){
        $("#menuESC").click();
    }

    /* File->New, JE File Dialog Box */
    if ($("#dialog").length>0) {
        $("#dialog").dialog("close");
    }
    JS.dialog = $("#dialogTemplate")
        .tmpl({size: "2", def:"", label: "Enter File Name:"})
        .dialog({
	    modal:true, 
	    title: "New",
	    buttons: { "OK": function(){ $(this).trigger('submit'); }},
            close: function(ev, ui) { $(this).remove(); }
		
        }).submit(function(){ dialogNewSubmit(); });

});


/* File->New */
//$("#dialogNew").submit(function() {
function dialogNewSubmit() {
    /*
    ** The New file name, mm, must be 01-12 and not exisit on the server.
    */
    //mm = $("input#dialogNewinp").val();
    mm = $("input#dialoginp").val();
	
    if (mm.length < 2 || mm < '01' || mm > '12') {
        $("#dialogError").text("File 01-12 only").show();
        return false;
	
    }
    /*
    ** The URL newfilename tests to see if the file exists on the server.
    ** If the complete function returns 200, the file exists.  A File->New
    ** function must define a new file.
    */
    newfilename = JS.jefileRestURI + JS.year + "/" + mm; 
    console.log("newfilename", newfilename);
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>New.  Creating a new Jefile.";
    JS.logHtml += "<br>GET "+newfilename;
    JS.logHtml += "<br>... verify that the new file does not exist";

    $.ajax({
        url: newfilename,
        complete: function(data) {
            console.log(data.status);
            if ( +data.status == 200 ) {
                /* Logging */
                $("#dialogError").text("File Already Exisits").show();
                JS.logHtml += "<br>... the Jefile-"+ JS.year + "/" + mm + " already exists.  New request rejected.";
                 JS.logHtml += "<br>... status-"+data.status;
                JS.logHtml += "</pre></td></tr></tbody>";
                $("#statusfield").html("");

                return false;
            } else {
                $("#contentJournal").html("<table id=\"journal\"></table>");
                JS.mm = mm;
                JS.jecnt = 0;
                JS.curidx = 0;
                JS.jefile = [];
                JS.jefileOpen = true;
                JS.jefileChanged = false;
                JS.recordsAdded = 0;
                JS.recordsDeleted = 0;
                JS.recordsChanged = 0;
            	
                /* Logging */
	        $("#dialog").dialog('close');
                JS.logHtml += "<br>... the Jefile-"+ JS.year + "/" + mm + "does not exist.  New file created.";
                JS.logHtml += "</pre></td></tr></tbody>";
                $("#statusfield").html("JEfile-" + JS.year + "/"+mm+" Opened");
            }
        }
    });

    $("#statusfield").html("JEfile-"+JS.year+"/"+mm+"...");
    JS.logHtml += "<br>... checking, ajax query sent";
		
		
 
//}); /* end of File->New */
}


/* File->Load */

$('#menuLoad').click(function(){
    console.log("menuLoad click function called");
    console.log("%o",this);
    $("#foot").text("");
    if (JS.jefileOpen === true && JS.jefileChanged === true) {
        console.log("menuLoad:  file already opened and has changed, need to prompt to save");
        $("#menuSave").click();
    }
    if ($("#menuESC").is(":visible")){
        $("#menuESC").click();
    }
    /* File->Load, JE File Dialog Box */
    if ($("#dialog").length>0) {
        $("#dialog").dialog("close");
    }
    JS.dialog = $("#dialogTemplate")
        .tmpl({size: "2", def: JS.mmfileinput, label: "Enter File Name:"})
        .dialog({
	    modal:true, 
	    title: "Load",
	    buttons: { "OK": function(){ $(this).trigger('submit'); }},
            close: function(ev, ui) { $(this).remove(); }
		
        }).submit(function(){ dialogLoadSubmit(); });

});



function dialogLoadSubmit() {
	//mm = $("input#mmfileinput").val();
	mm = $("input#dialoginp").val();
	
	if (mm.length < 2 || mm < '01' || mm > '12') {
		//$("#mmfiledialogerror").show();
                $("#dialogError").text("File  01-12 only");
		$("#dialogError").show();
		return false;
	
	}
        JS.mmfileinput = mm;  // default for next File menu dialog box

	//$("#dialogLoad").dialog('close');
	$("#dialog").dialog('close');
 	console.log( mm );
	
	
		
/* File->Load */
/* Load JE File from PHP server using AJAX */
		
    jefileRestGET = JS.jefileRestURI +JS.year+"/"+mm;

    /* Logging */
    start = new Date().getTime();
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Loading Jefile-"+JS.year+"/"+mm+"<br>GET "+jefileRestGET;
    $.blockUI({ message: '<h4><img src="images/busy.gif" /> Loading ...  </h4>' });

    //$.getJSON(jefileRestGET,function(response) {
    $.ajax({"url":jefileRestGET,
        "type":"GET",
        "dataType":"json", 
        success: function(response) {
            /* Parse response into JS.jefile */
            JS.jefile = response;
    
            
            /* Logging */
            JS.logHtml += "<br>... response received";
            JS.logHtml += "<br>... contents parsed into JS.jefile[]-"+JS.jefile.length+ " entries";
            //console.log ( "JS.jefile", JS.jefile );
    
            /* Format Journal Table */
            $("#contentJournal").html("<table id=\"journal\"></table>");
            jehtml = formatJsfrecArrayToHtml ( JS.jefile );
            $('table#journal').append(jehtml);
            $("#journal .displayTableEntry:first").addClass("displayTableEntryhighlight");
            $("#contentJournal").show();

            /* Set Journal control data - month, current index, record count, change status */
            JS.mm = mm;
            JS.curidx = 0;
            JS.jecnt = JS.jefile.length;
            JS.jefileOpen = true;
            JS.jefileChanged = false;
            JS.recordsAdded = 0;
            JS.recordsDeleted = 0;
            JS.recordsChanged = 0;

            $.unblockUI();
            /* Logging */
            $("#statusfield").html("JEfile-"+JS.year+"/"+mm+" Loaded. Cnt-"+JS.jecnt);
            //console.log($('#contentJournal'));
            end = new Date().getTime();
            diff = end - start;
            JS.logHtml += "<br>... time "+ diff;
            JS.logHtml += "</pre></td></tr></tbody>";

            //$("body").attr("tabindex",-1).focus();
            // to find the currently focused element: $(document.activeElement) it took me forever to find this!!
        }, /* end success: */
        error: function (req, stat, err) {
            console.log("file load failed", req.status,req.statusText);
            JS.logHtml += "<br>file load failed "+req.status+req.statusText;
            JS.logHtml += "JEfile-"+JS.year+"/"+mm+" Load failed.";
            JS.logHtml += "</pre></td></tr></tbody>";
            $.unblockUI();
            $("#statusfield").html("JeFile Load Failed.");
        } /* end error: */
    });
    $("#statusfield").html("JEfile-"+JS.year+"/"+mm+"...");
 
//}); /* end of File->Load */
}



/* File->Save */

$('#menuSave').click(function(){

    /* Save JE File to PHP server using AJAX */
    $("#foot").text("");


    /* Logging */
    console.log("menuSave click function called");
    start = new Date().getTime();
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Saving JS.jefile";

		
    if (JS.jefileOpen == false) {
        console.log("menuSave:  nothing opened, nothing to save");
        JS.logHtml += "...nothing opened, nothing to save";
        JS.logHtml += "</pre></td></tr></tbody>";
        $("#foot").text("Save: Nothing Opened. Nothing to Save.");
        return;
    } else if (JS.jefileOpen === true && JS.jefileChanged === false) {
        console.log("menuSave:  file opened but nothing has changed, no save" );
        JS.logHtml += "...file opened but nothing has changed, no save";
        JS.logHtml += "</pre></td></tr></tbody>";
        $("#foot").text("Save: File opened, but nothing has changed.");
        return;
    }
    if ($("#menuESC").is(":visible")){
        $("#menuESC").click();
    }
    saveFileRestPUT = JS.jefileRestURI  + JS.year + "/" + JS.mm; 
    jefilejson = $.toJSON(JS.jefile);
    console.log("saveFileRestPUT", saveFileRestPUT);
    JS.logHtml += "<br>PUT "+saveFileRestPUT;
    $.ajax({
        url: saveFileRestPUT,
        type: "PUT",
        data: {"jefilejson":jefilejson, "jefilename":JS.mm},
        complete: function(data) {
            console.log(data.status);
            if ( +data.status == 200 ) {

                /* Logging */
                $("#statusfield").html("JEfile-"+JS.year+"/"+mm+" saved. Cnt-"+JS.jecnt);
                JS.logHtml += "<br>... file saved.  Record count-"+JS.jecnt;
                JS.logHtml += "<br>... Adds-"+JS.recordsAdded+", Deletes-"+JS.recordsDeleted+", Changes-"+JS.recordsChanged;
                end = new Date().getTime();
                diff = end - start;
                JS.logHtml += "<br>... time "+ diff;
                JS.logHtml += "</pre></td></tr></tbody>";
                $("#foot").text("Save: Successful.");

                JS.jefileOpen = true;
                JS.jefileChanged = false;
                JS.recordsAdded = 0;
                JS.recordsDeleted = 0;
                JS.recordsChanged = 0;
                return false;
            } else {
                $("#statusfield").html("JEfile-"+JS.year+"/"+mm+" save failed");
                JS.logHtml += "<br>... save failed.";
                JS.logHtml += "</pre></td></tr></tbody>";
                $("#foot").text("Save: Failed.");
            }
        }
    });

    $("#statusfield").html("JEfile-"+JS.year+"/"+mm+" saving...");
    $("#foot").text("Save...");
    JS.logHtml += "<br>... saving...";
		
		
 
}); /* end of File->Save */

/* Edit->Append */
$('#menuAppend').click(function() {
    console.info("menuAppend click function called");
    if ( JS.jefileOpen === false ) {
        console.info("menuAppend: no file opened");
        return;
    }
    insertJeInputFormAtCuridx( "after" );
});

/* Edit->Insert */
$('#menuInsert').click(function() {
    console.info("menuInsert click function called");
    if ( JS.jefileOpen === false ) {
        console.info("menuInsert: no file opened");
        return;
    }

    insertJeInputFormAtCuridx( "before" );

});

/* Edit->Change */
$('#menuChange').click(function() {
    console.info("menuChange click function called");
    if ( JS.jefileOpen === false ) {
        console.info("menuChange: no file opened");
        return;
    }

    /*
    ** To change the current journalEntry, at JS.curidx,
    ** first insert a jeInputForm after JS.curidx,
    ** populate the values from the journalEntry, then
    ** remove the journalEntry.
    */
    jefrec = JS.jefile[JS.curidx];
    insertJeInputFormAtCuridx( "after", jefrec );
    JS.recordsAdded--;
    /* next to code:  delete html and jefrec entry for curidx record */
    curjournalEntry = $("#journal .displayTableEntry").eq(JS.curidx);
    curjournalEntry.remove();
    JS.jefile.splice(JS.curidx,1);
    JS.recordsChanged++;
});

/* Edit->Delete */
$('#menuDelete').click(function() {
    console.info("menuDelete click function called");
    if ( JS.jefileOpen === false ) {
        console.info("menuDelete: no file opened");
        return;
    }

    /*
    ** To delete the current journalEntry, at JS.curidx,
    ** first removed the tbody entry in the #journal table
    ** then remove the array entry at JS.jefile[JS.curidx], 
    ** then decrement the total record count.  The new current
    ** journalEntry is highlighted.
    */
    curjournalEntry = $("#journal .displayTableEntry").eq(JS.curidx);
    curjournalEntry.remove();
    JS.jefile.splice(JS.curidx,1);
    JS.jecnt--;
    if (JS.jecnt > 0 ) {
        if ( JS.curidx >= JS.jecnt ) {
            JS.curidx = JS.jecnt - 1;
        }  
        curjournalEntry = $("#journal .displayTableEntry").eq(JS.curidx);
        curjournalEntry.addClass("displayTableEntryhighlight");
    }
    JS.jefileChanged = true;
    JS.recordsDeleted++;

});

/* Edit->Search */
$('#menuSearch').click(function() {
    console.info("menuSearch click function called");
    if ( JS.jefileOpen === false ) {
        console.info("menuSearch: no file opened");
        return;
    }

    /* open a dialog box and prompt for search string */
    if ($("#dialog").length>0) {
        $("#dialog").dialog("close");
    }
    JS.dialog = $("#dialogTemplate")
        .tmpl({size: "10", def: JS.searchinput, label: "Search:"})
        .dialog({
	    modal:true, 
	    title: "Search",
	    buttons: { "OK": function(){ $(this).trigger('submit'); }},
            close: function(ev, ui) { $(this).remove(); }
		
        }).submit(function(){ dialogSearchSubmit(); });

});


/* Edit->Search Dialog box definition */

function dialogSearchSubmit() {
    //var search = $("input#searchinp").val();
    var search = $("input#dialoginp").val();
    console.log("dialogSearchSubmit Entered. Search-%s", search);
	
    if (search.length < 1 ) {
        $("#dialog").dialog("close");
        return false;
    }
    JS.searchinput=search;
	
	
    /*
    ** To search, start looking at text fields of the JS.jefile array entries 
    ** starting at JS.curidx, to the end of the file.
    ** If not found, restart searching from JS.jefile[0] and search
    ** upto JS.curidx-1.  If found, make the matched journalentry record
    ** the new JS.curidx.  Unhighlight the old curidx and highlight the new.
    ** If the journalEntry is not visible or only partically visible on the
    ** browser window, then slide the window to put the found item in the
    ** middle of the window.
    */

    var match = false;
    curjournalEntry = $("#journal .displayTableEntry").eq(JS.curidx);
    searchjournalEntry = curjournalEntry.next();
    for ( i = JS.curidx+1; i < JS.jecnt; i++ ) {
        if ( searchjournalEntry.find(":contains(" + search + ")").length > 0 ) {
            match = true;
            break;
        }
        searchjournalEntry = searchjournalEntry.next();
    }
    console.log("search submit", match, i);
    if ( match === false ) {
        searchjournalEntry = $("#journal .displayTableEntry:first");
        for ( var i = 0; i < JS.curidx-1; i++ ) {
            if ( searchjournalEntry.find(":contains(" + search + ")").length > 0 ) {
                match = true;
                break;
            }
            searchjournalEntry = searchjournalEntry.next();
        }
    }
    console.log("search submit", match, i);
    if ( match === true ) {
        curjournalEntry.removeClass("displayTableEntryhighlight");
        searchjournalEntry.addClass("displayTableEntryhighlight");
        if ( i >= JS.curidx ) {
	    scrollupIfElemDoesntFullyFitInView(searchjournalEntry);
        } else {
	    scrolldownIfElemDoesntFullyFitInView(searchjournalEntry);
        }
        JS.curidx = i;
        $("#dialog").dialog("close");
    } else {
        $("#dialogError").text("Not Found");
	$("#dialogError").show();
        return false;
    }


//});
};


/* Edit->Yank */
$('#menuYank').click(function() {
    console.info("menuYank click function called");
    if ( JS.jefileOpen === false ) {

        /* Logging */
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>Yank: No file Opened";
        JS.logHtml += "</pre></td></tr></tbody>";
        console.info("menuYank: no file opened");
        return;
    }

    /* open a dialog box and prompt for search string */
    if ($("#dialog").length>0) {
        $("#dialog").dialog("close");
    }
    JS.dialog = $("#dialogTemplate")
        .tmpl({size: "1", def: "", label: "Count (1-9):"})
        .dialog({
	    modal:true, 
	    title: "Yank",
	    buttons: { "OK": function(){ $(this).trigger('submit'); }},
            close: function(ev, ui) { $(this).remove(); }
		
        }).submit(function(){ dialogYankSubmit(); });

});


/* Edit->Yank Dialog box definition */

function dialogYankSubmit() {
    //var yankinp = $("input#yankinp").val();
    var yankinp = $("input#dialoginp").val();
	
    if (yankinp.length < 1 ) {
        //$("#dialogYank").dialog("close");
        $("#dialog").dialog('close');
        return false;
    }
	
    if (yankinp < '0' || yankinp > '9' ) {
        //$("#dialogYankError").show();
        $("#dialogError").text("1-9 only");
        $("#dialogError").show();
        return false;
    }
	
    /*
    ** The Yank function copies "yankinp" number of journalEntries
    ** into a JE clip board.  These are stored as an arrar of jefrec objects.
    ** The user input limits yankinp to a number 1-9.  The function does not
    ** move JS.curidx, but the clip board will be saved so that the array contents
    ** can be inserted into a new file.  (Edit-Put operation)
    ** A Yank overwrites the previous yank operation.
    ** If a yankinp is greater than the count records between JS.curidx and JS.jecnt, 
    ** then only yank the records upto JS.jecnt
    */

    JS.YankPutArray = [];
    JS.YankPutArrayCnt = 0;
    for ( var i = 0; i+JS.curidx<JS.jecnt && i < yankinp; i++ ) {
        console.log(i, JS.jefile[JS.curidx+i]);
        JS.YankPutArray[i] = JS.jefile[JS.curidx+i];
        console.log(JS.YankPutArray);
        JS.YankPutArrayCnt++;
    }
    //$("#dialogYank").dialog("close");
    $("#dialog").dialog('close');

    /* Logging */
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Yank: "+JS.YankPutArrayCnt+ " Journal Entries";
    JS.logHtml += "</pre></td></tr></tbody>";
    console.log("JS.YankPutArray", JS.YankPutArray);

    /*
    ** Store the JS.YankPutArray on server.  Allows for crossbrowser, cross-year cut/paste
    */
    start = new Date().getTime();
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Saving JS.YankPutArray";
    yankPutArrayPUT = JS.jefileRestURI  + "yankput.json";
    yankputjson = $.toJSON(JS.YankPutArray);
    console.log("yankPutArrayPUT", yankPutArrayPUT);
    JS.logHtml += "<br>PUT "+yankPutArrayPUT;
    $.ajax({
        url: yankPutArrayPUT,
        type: "PUT",
        data: {"yankputjson":yankputjson},
        complete: function(data) {
            console.log(data.status);
            if ( +data.status == 200 ) {

                /* Logging */
                $("#statusfield").html("YankPut-saved. Cnt-"+JS.YankPutArrayCnt);
                $("#foot").text("Yank: copied "+JS.YankPutArrayCnt+" Journal Entries.");
                end = new Date().getTime();
                diff = end - start;
                JS.logHtml += "<br>... time "+ diff;
                JS.logHtml += "</pre></td></tr></tbody>";
                return false;
            } else {
                $("#statusfield").html("YankPut- save failed");
                JS.logHtml += "<br>... save failed.";
                JS.logHtml += "</pre></td></tr></tbody>";
            }
        }
    });

    $("#statusfield").html("YankPut-saving...");
    JS.logHtml += "<br>... saving...";


//});
}

/* Edit->Put 
** This pulls the file yankput.json from the web server.
** If the file doesn't exisit or is more than 60 minutes.
** The Put operation follows a prior Yank.  If no Yank, then fail, silently.
** The Put operation only makes sense if a jefile is opened.
** If the Put operation fails, just display a message along the
** bottom of the screen.
*/
$('#menuPut').click(function() {
    console.info("menuPut click function called");
    if ( JS.jefileOpen === false ) {
        /* Logging */
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>Put: no file opened, cannot put.";
        JS.logHtml += "</pre></td></tr></tbody>";
        console.info("menuPut: no file opened");
        $("#foot").text("Put Fail.  No file opened, cannot Put.");
        return;
    }
	
    /*
    ** Get yankput.json file.  This was created by a prior Yank operation.  
    */
    yankPutArrayGET = JS.jefileRestURI  + "yankput.json";

    /* Logging */
    start = new Date().getTime();
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Loading JS.YankPutArray<br>GET "+yankPutArrayGET;
    console.log("yankPutArrayGET", yankPutArrayGET);

    $.ajax({"url":yankPutArrayGET,
        "type":"GET",
        "dataType":"json",
        success: function(response) {
            /* Parse response into JS.YankPutArray */
            JS.YankPutArray = response;
            JS.YankPutArrayCnt = JS.YankPutArray.length;


            /* Logging */
            JS.logHtml += "<br>... response received";
            JS.logHtml += "<br>... contents parsed into JS.YankPutArray[]-"+JS.YankPutArrayCnt+ " entries";
            console.log ( "JS.YankPutArray", JS.YankPutArray );
            $("#statusfield").html("YankPut-Loaded. Cnt-"+JS.YankPutArrayCnt);
            end = new Date().getTime();
            diff = end - start;
            JS.logHtml += "<br>... time "+ diff;
            JS.logHtml += "</pre></td></tr></tbody>";

            if ( JS.YankPutArrayCnt > 9) { 
                JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
                JS.logHtml += "<br>... YankPut Count > 9.  Something is wrong. Put exiting.";
                JS.logHtml += "</pre></td></tr></tbody>";
                $("#foot").text("Put Fail.  YankPut contains more than 9 entries.");
                return;
            }
            

            /* Perform the Put function */
            putYankPutIntoJefileAtCuridx();

            
        }, /* end success: */
        error: function (req, stat, err) {
            /* Logging */
            console.log("YankPut load failed", req.status,req.statusText);
            JS.logHtml += "<br>....file load failed "+req.status+req.statusText;
            $("#statusfield").html("YankPut-load failed");
            $("#foot").text("Put Fail.  YankPut couldn't be retrieved from server");
            JS.logHtml += "</pre></td></tr></tbody>";
        } /* end error: */
    });
    $("#statusfield").html("YankPut-loading");
    JS.logHtml += "<br>... loading...";


});

/* Edit->Put */
function putYankPutIntoJefileAtCuridx() {

    /*
    ** The Put function inserts the JS.YankPutArray into the JS.jefile
    ** at the JS.curidx.  The new JS.curidx will point at the first
    ** newly inserted item from JS.YankPutArray; the highlighting will be
    ** updated.  If JS.YankPutArrayCnt is 0, then do nothing.
    */

    if ( JS.YankPutArrayCnt <= 0 ) {
        /* Logging */
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>Put: nothing to Put, no Journal Entries Yanked";
        JS.logHtml += "</pre></td></tr></tbody>";
        $("#foot").text("Put Fail.  No prior Yank operation.");
        return;
    }

    console.log(JS.YankPutArray);

    /*
    ** Change the date in JS.YankPutArrary to match the currently opened JS.jefile -- JS.mm
    */

    var i, dd, linetail;

    /* re did loop using $.each.  Note:  assumed function passes by reference */
    $.each (JS.YankPutArray, function ( i, jefrec ) {
        dd = jefrec.mmdd.substr(2);
        if (jefrec.line !== undefined) {
            linetail = jefrec.line.substr(2);
        }
        jefrec.mmdd = JS.mm + dd;
        jefrec.line = JS.mm + linetail;
    
    });


    /*
    ** Convert JS.YankPutArray into html and insert into table#journal
    ** JS.curidx.  Handle the case if the table#journal is empty.
    ** Hightlight the first element inserted from JS.YankPutArray.
    */
    jehtml = formatJsfrecArrayToHtml ( JS.YankPutArray );
    if (JS.jecnt == 0 ) {
        $("table#journal").append(jehtml);
        $("#journal .displayTableEntry:first").addClass("displayTableEntryhighlight");
        JS.jefile = JS.YankPutArray;
        JS.curidx = 0;
        JS.jecnt = JS.YankPutArrayCnt;
        JS.recordsAdded += JS.YankPutArrayCnt;
        JS.jefileChanged = true;
    } else {
        curjournalEntry = $("#journal .displayTableEntry").eq(JS.curidx);
        curjournalEntry.after(jehtml);
        firstnewput = curjournalEntry.removeClass("displayTableEntryhighlight").next();
        firstnewput.addClass("displayTableEntryhighlight");
        /* copy JS.YankPutArray into JS.jefile after JS.curidx (before JS.curidx+1) */
        //for ( var i = 0; i < JS.YankPutArrayCnt; i++) {
            //JS.jefile.splice(JS.curidx+1+i, 0, JS.YankPutArray[i]);
        //}
        $.each( JS.YankPutArray, function( i, jefrec ) {
            JS.jefile.splice(JS.curidx+1+i, 0, jefrec);
        });
        JS.curidx++;
        JS.jecnt = JS.jecnt + JS.YankPutArrayCnt;
        JS.recordsAdded += JS.YankPutArrayCnt;
        JS.jefileChanged = true;
        //newrow = $("#journal tbody").eq(JS.curidx+1);
        scrollupIfElemDoesntFullyFitInView(firstnewput, 300);
    }
    /* Logging */
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Put: added "+JS.YankPutArrayCnt+" Journal Entries.";
    JS.logHtml += "</pre></td></tr></tbody>";
    $("#foot").text("Put: added "+JS.YankPutArrayCnt+" Journal Entries.");

};


/* Report->Analdtl */
$('#menuAnaldtl').click(function() {
    console.info("menuAnaldtl click function called");

    if (JS.jefileOpen === true && JS.jefileChanged === true) {
        /* Logging */
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>Analdtl: file opened and contents has changed. Save file without prompting";
        JS.logHtml += "</pre></td></tr></tbody>";
        console.log("menuAnaldtl:  file opened and contents has changed, save file without prompting" );

        $("#menuSave").click();
    }
    /* Open a dialog box and prompt for a 3 digit account number */
    if ($("#dialog").length>0) {
        $("#dialog").dialog("close");
    }
    JS.dialog = $("#dialogTemplate")
        .tmpl({size: "3", def: JS.analdtlinp, label: "Enter Account:"})
        .dialog({
	    modal:true, 
	    title: "Analdtl",
	    buttons: { "OK": function(){ $(this).trigger('submit'); }},
            close: function(ev, ui) { $(this).remove(); }
		
        }).submit(function(){ dialogAnaldtlSubmit(); });

});

/* Report->Analdtl,  Account input Dialog Box */

/* Report->Analdtl */
function dialogAnaldtlSubmit() {
    /*
    ** The Analyze Detail report, queries the Journal Entry files starting
    ** from the beginning of the year, looking for journal entry items
    ** that touch a given account.
    ** The account must be 3 digits (\d\d[0-9a-z]) and exisit in JS.chart
    ** The report sorts by month and order entered in the jefile, subtotaling
    ** each month.
    */
    //var acct = $("input#dialogAnaldtlinp").val();
    var acct = $("input#dialoginp").val();
	
    if (acct.length != 3 || JS.chart[acct] == undefined) { 
        $("#dialogError").text("Account not found").show();
        return false;
	
    }
    JS.analdtlinp = acct;   // default for next Analdtl dialog box
    //$("#dialogAnaldtl").dialog("close");
    $("#dialog").dialog('close');

   
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
    JS.logHtml += "<br>Generating Analdtl Report for account-"+acct+"<br>GET "+jefileRestGET;
    start = new Date().getTime();
    $.blockUI({ message: '<h4><img src="images/busy.gif" /> Loading ...  </h4>' });

    $.ajax({"url":jefileRestGET,
        "type":"GET",
        "dataType":"json", 
        success: function(data) {
            JS.logHtml += "<br>... received "+data.length+" bytes.";
            JS.nfyy = data;

            $("#statusfield").html("Analdtl Loaded");
            JS.logHtml += "<br>... sorting data";

            /*
            ** Input: JS.nfyy["01" - "12"]
            ** Output: JS.nfyy["00.pgl" - "12.pgl"]
            */
            transformMMtoPGL();

            /* Log XX.pgl record counts */
            MMcnt = "<br>... MM / Count";
            $.each(JS.nfyy, function (key,value) {
                if(key.length==2){
                    MMcnt += "<br>    "+key+" / "+value.length;
                }
            });
            JS.logHtml += MMcnt;

            $("#statusfield").html("Analdtl Generating");
            JS.logHtml += "<br>... generating report";
            rep = AnaldtlReportHtml(acct);


            end = new Date().getTime();
            diff = end - start;
            JS.logHtml += "<br>... time "+ diff;
            JS.logHtml += "</pre></td></tr></tbody>";

            $("#contentJournal").hide();
            $("#contentReport").html(""+rep+"");

            /* All TOTAL lines are bold */
            $("#report tbody tr td:contains(TOTAL)").css("font-weight","900")

            JS.report.cnt = $("#report tbody").length;
            JS.report.curidx = JS.report.cnt-1;
            $("#report .displayTableEntry:last").addClass("displayTableEntryhighlight");
            $("#contentReport").show();
            $('html, body').animate({ scrollTop: $(document).height()}, 750); 

            $.unblockUI();
            $("#statusfield").html("Analdtl Done");
            $("#menuESC").show();
        }, /* end success: */
        error: function (req, stat, err) {
            console.log("analdtl load failed", req.status,req.statusText);
            JS.logHtml += "<br>analdtl load failed "+req.status+" "+req.statusText+" "+err;
            JS.logHtml += "<br>Analdtl-"+JS.year+"/?? Load failed.";
            JS.logHtml += "</pre></td></tr></tbody>";
            $.unblockUI();
            $("#statusfield").html("Analdtl Load Failed.");
        } /* end error: */
    });


    $("#statusfield").html("Analdtl...");

    //$("#contentJournal").hide();
    //$("#contentReport").show();
//});
};






/* Report->Glrpt */
$('#menuGlrpt').click(function() {
    console.info("menuGlrpt click function called");

    if (JS.jefileOpen === true && JS.jefileChanged === true) {
        /* Logging */
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>Glrpt: file opened and contents has changed. Save file without prompting";
        JS.logHtml += "</pre></td></tr></tbody>";
        console.log("menuGlrpt:  file opened and contents has changed, save file without prompting" );

        $("#menuSave").click();
    }

    if (typeof dialogGlrptSubmit == "undefined") {
        dynamicallyLoadJSFile('scripts/glrpt.js?q=123', function(){
            console.log('dynamicallyLoadJSFile: Load was performed.');
            dialogGlrptSubmit();
        });
    } else {
        dialogGlrptSubmit(); 
    }

});


/* Report->Aarpt */
$('#menuAarpt').click(function() {
    console.info("menuAarpt click function called");

    if (JS.jefileOpen === true && JS.jefileChanged === true) {
        /* Logging */
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>Aarpt: file opened and contents has changed. Save file without prompting";
        JS.logHtml += "</pre></td></tr></tbody>";
        console.log("menuAarpt:  file opened and contents has changed, save file without prompting" );

        $("#menuSave").click();
    }

    if (typeof dialogAarptSubmit == "undefined") {
        dynamicallyLoadJSFile('scripts/aarpt.js?q=123', function(){
            console.log('dynamicallyLoadJSFile: Load was performed.');
            dialogAarptSubmit();
        });
    } else {
        dialogAarptSubmit(); 
    }

});




/* Report->Log */
$('#menuLog').click(function() {
    console.info("menuLog click function called");
    if (JS.jefileOpen === true && JS.jefileChanged === true) {
        /* Logging */
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>Report->Log: file opened and contents has changed. Save file without prompting";
        JS.logHtml += "</pre></td></tr></tbody>";
        console.log("menuAnaldtl:  file opened and contents has changed, save file without prompting" );

        $("#menuSave").click();
    }

    $("#contentJournal").hide();
    $("#contentReport").html("<table id=report>"+JS.logHtml+"</table>");
    JS.report.cnt = $("#report tbody").length;
    JS.report.curidx = JS.report.cnt-1;
    $("#report .displayTableEntry:last").addClass("displayTableEntryhighlight");
    $("#contentReport").show();
    $('html, body').animate({ scrollTop: $(document).height()}, 750); 
    $("#menuESC").show();


});

/* Report->Close */
$('#menuClose').click(function() {
    console.info("menuClose click function called");
    if (JS.jefileOpen === true && JS.jefileChanged === true) {
        /* Logging */
        JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
        JS.logHtml += "<br>Report->Log: file opened and contents has changed. Save file without prompting";
        JS.logHtml += "</pre></td></tr></tbody>";
        console.log("menuClose:  file opened and contents has changed, save file without prompting" );

        $("#menuSave").click();
    }

    if (typeof dialogCloseSubmit == "undefined") {
        dynamicallyLoadJSFile('scripts/close.js?q=123', function(){
            console.log('dynamicallyLoadJSFile: Load close.js was performed.');
            dialogCloseSubmit();
        });
    } else {
        dialogCloseSubmit();
    }
});



/* Report->Search */
$('#menuReportSearch').click(function() {
    console.info("menuReportSearch click function called");

    /* open a dialog box and prompt for search string */
    if ($("#dialog").length>0) {
        $("#dialog").dialog("close");
    }
    JS.dialog = $("#dialogTemplate")
        .tmpl({size: "10", def: JS.searchinput, label: "Search:"})
        .dialog({
	    modal:true, 
	    title: "Search",
	    buttons: { "OK": function(){ $(this).trigger('submit'); }},
            close: function(ev, ui) { $(this).remove(); }
		
        }).submit(function(){ dialogReportSearchSubmit(); });

});


/* Report->Search Dialog box definition */

function dialogReportSearchSubmit() {
    //var search = $("input#reportSearchinp").val();
    var search = $("input#dialoginp").val();
    console.log("dialogSearchSubmit Entered. Search-%s", search);
	
    if (search.length < 1 ) {
        //$("#dialogReportSearch").dialog("close");
        $("#dialog").dialog("close");
        return false;
    }
    JS.searchinput=search;
	
	

    /*
    ** Search the most recently run report sitting in the #report div.
    ** The text is a table with each line wrapped in a tbody.
    ** The search starts from the current line + 1 and searches down, then wraps to the top.
    ** 
    */

    var match = false;
    var curreportEntry = null;
    var searchreportEntry = null;
    curreportEntry = $("#report .displayTableEntry").eq(JS.report.curidx);
    searchreportEntry = curreportEntry.next();
    for ( i = JS.report.curidx+1; i < JS.report.cnt; i++ ) {
        if ( searchreportEntry.find(":contains(" + search + ")").length > 0 ) {
            match = true;
            break;
        }
        searchreportEntry = searchreportEntry.next();
    }
    console.log("search submit", match, i);
    if (match === false) {
        searchreportEntry = $ ("#report .displayTableEntry:first");
        for ( var i = 0; i < JS.report.curidx-1; i++ ) {
            if ( searchreportEntry.find(":contains(" + search + ")").length > 0 ) {
                match = true;
                break;
            }
            searchreportEntry = searchreportEntry.next();
        }
    }
    console.log("search submit", match, i);
    if ( match === true ) {
        curreportEntry.removeClass("displayTableEntryhighlight");
        searchreportEntry.addClass("displayTableEntryhighlight");
        if ( i >= JS.report.curidx ) {
	    scrollupIfElemDoesntFullyFitInView(searchreportEntry);
        } else {
	    scrolldownIfElemDoesntFullyFitInView(searchreportEntry);
        }
        JS.report.curidx = i;
        //$("#dialogReportSearch").dialog("close");
        $("#dialog").dialog("close");
    } else {
        //$("#dialogReportSearchError").show();
        $("#dialogError").text("Not Found");
	$("#dialogError").show();
        return false;
    }


//});
}


/* Report->ESC */
$('#menuESC').click(function() {
    console.info("menuESC click function called");
    $("#foot").text("");

    $("#menuESC").hide();
    $("#contentReport").hide();
    $("#contentJournal").show();
    if (JS.jecnt > 0) {
        newrow = $("#journal tbody").eq(JS.curidx);
        scrollupIfElemDoesntFullyFitInView(newrow);
        scrolldownIfElemDoesntFullyFitInView(newrow);
    }
});

/*
** Generate Analyze Detail Report
** - Input: JS.nfyy["00.pgl" - "12.pgl"].pglfile[i] 
** - Input: Dialog box prompts for an acct number
**
** - Output:  HTML neatly formated report with totals and subtotals for the inputted acct
*/
function AnaldtlReportHtml(acctinp) {
var i, j, k;
var monamt = 0;
var monrcnt = 0;
var runamt = 0;
var lamt = 0;
var pglfile = null;
var rep = "<table id=report>";
//var acctinp = $("input#dialoginp").val()
var SubAcct = {};

for ( i=0; i < JS.months.length; i++ ) {
   if ( JS.nfyy[JS.months[i]] != undefined ) {
      pglfile = JS.nfyy[JS.months[i]+".pgl"];
      monamt = 0;
      monrcnt = 0;
      for (j=0; j< pglfile.length; j++) {
         if (pglfile[j].acct == acctinp) {
            monrcnt++;
            lamt =  pglfile[j].amt;
            monamt = monamt + parseFloat(lamt);
            runamt = runamt + parseFloat(lamt);

            var reportline = sprintf("  %s/%s %s %9.2f %9.2f %s",
                         pglfile[j].mmdd.substring(0,2),
                         pglfile[j].mmdd.substring(2),
                         pglfile[j].acct,
                         parseFloat(lamt),
                         runamt,
                         pglfile[j].desc);
            rep = rep + "<tbody class=\"displayTableEntry\"><tr><td><pre>"+reportline+"</pre></td></tr></tbody>";
            if( JS.chart[acctinp].subacct === true ) {
               if( isNaN(SubAcct[pglfile[j].desc]) ) {
                  SubAcct[pglfile[j].desc] = 0;
               }
               SubAcct[pglfile[j].desc] += parseFloat(lamt);
            }

         } // if
      } // for j < pglfile.length
      if (monrcnt > 0) {
         rep += "<tbody class=\"displayTableEntry\"><tr><td><pre>"+sprintf("  *TOTAL  - %9.2f*",monamt)+"</pre></td></tr></tbody>";
      }
      rep += "<tbody class=\"displayTableEntry\"><tr><td><pre>"+sprintf("*YTD TOTAL %s -       %9.2f*",JS.months[i], runamt)+"</pre></td></tr></tbody>";
   } // if
} //for i
if( JS.chart[acctinp].subacct === true ) {
    $.each( SubAcct, function( desc, totamt ) {
       rep += "<tbody class=\"displayTableEntry\"><tr><td><pre>"+sprintf("  %-18.18s %10.2f*",desc,totamt)+"</pre></td></tr></tbody>";
    });
}
rep += "<tbody class=\"displayTableEntry\"><tr><td><pre>"+sprintf("**GRAND TOTAL  -      %9.2f**", runamt)+"</pre></td></tr></tbody>";
rep += "</table>";
return rep;
}

/* Mouse Events */

    /* Hover  - hightlight current journalEntry*/
    $("tbody.DISABLEjournalEntry").live('mouseover mouseout', function(evt) {
      if (evt.type == 'mouseover') {
        $(this).addClass("displayTableEntryhighlight");
      } else {
        $(this).removeClass("displayTableEntryhighlight");
      }
    });

   /* Click - select a journalEntry  or reportEntry in the displayTable */
    $("tbody.displayTableEntry").live('click', function() {
        var oldidx = null;
        var newidx = null;
        var rows = null;
        newidx = $(this).parent().children().index($(this));
        if ($("#contentJournal").is(":visible")){
            rows = $("table#journal").find(".displayTableEntry");
            oldidx = JS.curidx;
            JS.curidx = newidx;
        } else if ($("#contentReport").is(":visible")) {
            rows = $("table#report").find(".displayTableEntry");
            oldidx = JS.report.curidx;
            JS.report.curidx = newidx;
        }
        /* Old ---
        rows = $("table#journal").find(".displayTableEntry");
        rows.eq(JS.curidx).removeClass("displayTableEntryhighlight");
        JS.curidx = $(this).parent().children().index($(this));
        console.log("click event", JS.curidx);
        rows.eq(JS.curidx).addClass("displayTableEntryhighlight"); 
        --- Old */
        console.log("click event", newidx);
        rows.eq(oldidx).removeClass("displayTableEntryhighlight");
        rows.eq(newidx).addClass("displayTableEntryhighlight"); 


    });



/*  Keyboard Navigation */



    /* Input field keystroke management */
	


    /* experimental.  doesnt do anything */
    $('#journal input.ddinp').live('keyup keydown blur', function(evt) {
        key = evt.which;
        classinp=$(this).attr('class');
        val=$(this).val();
        type = evt.type;
        console.log("input.ddinp: type-%s, classinp-%s, key-%d, val-'%s'",
                    type, classinp, key, val);
        }
    );


    $('#journal input').live('keydown', function(evt) {
        key = evt.which;
        classinp=$(this).attr('class');
        val=$(this).val();
        vallen = val.length;
        maxlength=$(this).attr('maxlength');
        //console.log("input keydown", $(evt.which), $(evt.target), val, vallen);
        console.log("input keydown", $(evt.which), classinp,  val, vallen);
        isShiftKey = evt.shiftKey;
        console.log("shiftkey-",isShiftKey);

        jeInputForm = $(".jeInputForm");

        /* if the first 3 fields are blank and ESC pressed, 
        ** or the first amt is blank then remove jeInputForm
        */
        if ( key == 27 ) {
            ddinp = jeInputForm.find(".ddinp").val();
            acctinp = jeInputForm.find(".acctinp").val();
            amtinp = jeInputForm.find(".amtinp").val();

            /* if a jeInputForm is mostly empty, then erase */
            if ( ddinp === "" && acctinp === "" && amtinp === "" 
              || ddinp !== "" && acctinp !== "" && amtinp === "" ) {
                jeInputForm.remove();
                $("#journal .displayTableEntry").eq(JS.curidx).addClass("displayTableEntryhighlight");
                JS.recordsAdded--;
                $("#foot").text("");
                return;
            }
        }



        // class="ddinp" or class="ddinp idleFocus" or class="ddinp xxxxFocus"
        classar = classinp.split(" ");
        for ( var i = 0; i< classar.length; i++ ) { 
        switch(classar[i])
        {
        case 'ddinp':
            console.log("ddinp keydown. val-%s,  key-%d",val,key);
            /* TAB key */
            if (key==9) {
                if ( ! isvalidDD(val) ) {
                    evt.preventDefault();
                    $("#foot").text("Day out of range. Enter 01-31");
                    $(this).select();
                }
            }
            break;
        case 'acctinp':
        case 'cractinp':
            console.log("acctinp keydown. val-%s,  key-%d",val,key);
            /* TAB key */
            if (key==9) {
                if ( ! isvalidAcct (val) ) {
                    evt.preventDefault();
                    chartdesc = "** Invalid Code **";
                    $(this).parent().next().text(chartdesc);
                    $("#foot").text("Account-'"+val+"' not found in Chart of Accounts.");
                    $(this).select();
                }
            }
            break;
        case 'amtinp':
            console.log("amtinp keydown. val-%s,  key-%d",val,key);
            if ( key == 13) {
                if ( vallen > 0 && isinteger ( val ) === true ) {
                    this.value = val.concat('.00');
                }
            }
            /* TAB key */
            if (key == 9) {
                console.log("TAB");
                if (isShiftKey === true) {
                    console.log("Shift-TAB");
                    break;
                }

                console.log("Shift-TAB should not get here");
                if ( ! isvalidAmt (val) ) {
                    evt.preventDefault();
                    $("#foot").text("Amount not formated correctly.  E.g. 0.99, -100.12, 9999999.99, etc");
                    $(this).select();
                }
            }
            break;
        case 'cramtinp':
            console.log("cramtinp keydown. val-%s,  key-%d",val,key);
            if ( key == 13) {
                if ( val === '' ) {
                    $(this).blur();
                    $('.descinp').focus();
                } else {
                    // insert a new row above this row
                    if ( vallen > 0 && isinteger ( val ) === true ) {
                        this.value = val.concat('.00');
                    }
                }
            }
            /* TAB key */
            if (key==9) {
            console.log("cramtinp keydown tab. val-%s,  key-%d, isShiftKey-%s",val,key,isShiftKey);
                if ( val === '' ) {
                    //$(this).blur();
                    //$('.descinp').focus();
                } else if ( val!== '' && ! isvalidAmt (val) ) {
                    evt.preventDefault();
                    $("#foot").text("Amount not formated correctly.  E.g. 0.99, -100.12, 9999999.99, etc");
                    $(this).select();
                }
            }
            break;

        case 'descinp':
            /* After typing a description,
            ** type ESC to end the Insert/Append operation.
            ** this journal entry gets added to the JEfile
            */
            if ( key == 27 ) {
                $("#foot").text("");
                addJeInputFormToJEfile();
                //$("body").attr("tabindex",-1).focus();
            }

            /* After typing a description,
            ** type return to insert the current input form
            ** and then insert a new journalEntry
            */
            if ( key == 13 ) {
                $("#foot").text("");
                addJeInputFormToJEfile();
                insertJeInputFormAtCuridx( "after" );
                newrow = $("#journal tbody").eq(JS.curidx+1);
                scrollupIfElemDoesntFullyFitInView(newrow, 300);
            }
            break;

        default:
            break;
        } // switch
        } // for
    });

    $('#journal input').live('keyup', function(evt) {

        //console.log("input keyup",evt,evt.keyCode,evt.srcElement,evt.target.className,$(evt.target).attr('maxlength'),$(evt.target).attr('class'),$(evt.which),evt.type,$(evt.target).attr('value'));
        //console.log($(this).val(), $(this).attr('maxlength'), $(this).attr('class'));

        key = evt.which;
        val=$(this).val();
        vallen = val.length;
        maxlength=$(this).attr('maxlength');
        classinp=$(this).attr('class');
        idx = JS.inpfields.index(this);
        nextfld = JS.inpfields.eq(idx+1);
        console.log("input keyup. classinp-'%s' key=%d val='%s' vallen=%d idx=%d"
                    ,classinp,key, val,vallen,idx);
        isShiftKey = evt.shiftKey;
        console.log("shiftkey-",isShiftKey);
        //console.log(evt);

        /*          insert, home, end, left, up, right, down, shift  */
        speckeys = [45,     36,   35,  37,   38, 39,    40,   16];

        if ($.inArray(key,speckeys)>0) {
            return;
        }

        if(key==9) return;


        // class="ddinp" or class="ddinp idleFocus" or class="ddinp xxxxFocus"
        classar = classinp.split(" ");
        for (var i = 0; i< classar.length; i++ ) { 
        switch(classar[i])
        {
        case 'ddinp':
            console.log("ddinp keyup. val-%s,  key-%d",val,key);
            if (vallen >= maxlength) {
               if ( isvalidDD( val ) === true ) {
                    $(this).blur();
                    nextfld.focus();
               } else {
                    $("#foot").text("Day out of range. Enter 01-31");
                    $(this).select();
               }
            }
            break;

        case 'acctinp':
        case 'cractinp':
            console.log("acctinp keyup. val-%s,  key-%d",val,key);
            console.log("keyup acctinp entered");
            if (vallen >= maxlength) {
                if ( isvalidAcct ( val ) ) {
                    chartdesc = JS.chart[val].chDesc;
                    $(this).parent().next().text(chartdesc);
                    $(this).blur();
                    nextfld.focus();
                } else {
                    chartdesc = "** Invalid Code **";
                    $(this).parent().next().text(chartdesc);
                    $("#foot").text("Account-'"+val+"' not found in Chart of Accounts.");
                    $(this).select();
                }
            }
            $("#chartMenu").html(CHmenudisp(val));
            break;

        case 'amtinp':
            console.log("amtinp keyup. val-%s,  key-%d",val,key);
          
            /* if the amount is formatted correctly, auto tab to the next field */
            if ( isvalidAmt( val ) ) {
                console.log(val);
                $(this).blur();
                nextfld.focus();
            }
            break;
        case 'cramtinp':
            console.log("cramtinp keyup. val-%s,  key-%d",val,key);
            /* if the credit amount is formatted correctly, 
            ** and especially not blank, then insert another 
            ** row into the jeinputForm 
            */
            if ( val!='' && isvalidAmt( val ) ) {
                console.log('input keyup cramtinp',val);
                insertformabovelastrow();
                newrow = $("#journal tbody").eq(JS.curidx+1);
                scrollupIfElemDoesntFullyFitInView(newrow, 300);
                $(this).blur();
                $('table:first tbody.jeInputForm tr:last .cractinp').focus();
            }
            
            break;
        case 'descinp':
            break;
        } // switch
        } // for loop
    });


    /* Window-wide keystroke management */
    /* Key - HOME */
    $(document).bind('keydown', 'home', function(evt) {
	console.log("home\n");
	//$("body").scrollTop(0);
	$(window).scrollTop(0);
        var oldidx = null;
        if ($("#contentJournal").is(":visible")){
	    rows = $("#contentJournal table").find(".displayTableEntry");
            oldidx = JS.curidx;
	    JS.curidx = 0;
        } else if ($("#contentReport").is(":visible")) {
	    rows = $("#contentReport table").find(".displayTableEntry");
            oldidx = JS.report.curidx;
	    JS.report.curidx = 0;
        } else { 
            return(false);
        }
        rows.eq(oldidx).removeClass("displayTableEntryhighlight");
        rows.first().addClass("displayTableEntryhighlight");
	return(false);
	});

    /* Key - DOWN arrow */
    $(document).bind('keydown', 'down', function(evt) {
	console.log("down\n");
        
        var oldidx = null;
        if ($("#contentJournal").is(":visible")) {
            rows = $("#contentJournal table").find(".displayTableEntry");
            if (JS.curidx+1 < rows.length){
                oldidx = JS.curidx;
                JS.curidx++;
            } else {
                return(false);
            }
        } else if ($("#contentReport").is(":visible") ) {
            rows = $("#contentReport table").find(".displayTableEntry");
            if (JS.report.curidx+1 < rows.length) {
                oldidx = JS.report.curidx;
                JS.report.curidx++;
            } else {
                return(false);
            }
        } else {
            return(false);
        }
        currow = rows.eq(oldidx).removeClass("displayTableEntryhighlight");
        newrow = currow.next().addClass("displayTableEntryhighlight");
        scrollupIfElemDoesntFullyFitInView(newrow);
	return(false);
	});

    /* Key - UP arrow */
    $(document).bind('keydown', 'up', function(evt) {
	console.log("up\n");

        if ($("#contentJournal").is(":visible")) {
            rows = $("#contentJournal table").find(".displayTableEntry");
            if (JS.curidx > 0){
                oldidx = JS.curidx;
                JS.curidx--;
            } else {
                return(false);
            }
        } else if ($("#contentReport").is(":visible") ) {
            rows = $("#contentReport table").find(".displayTableEntry");
            if (JS.report.curidx > 0) {
                oldidx = JS.report.curidx;
                JS.report.curidx--;
            } else {
                return(false);
            }
        } else {
            return(false);
        }
        currow = rows.eq(oldidx).removeClass("displayTableEntryhighlight");
        newrow = currow.prev().addClass("displayTableEntryhighlight");
        scrolldownIfElemDoesntFullyFitInView(newrow);
	return(false);
	});


    /* Key - END */
    $(document).bind('keydown', 'end', function(evt) {
	console.log("end\n");
        $('html, body').animate({
                     scrollTop: $(document).height()
                 },
                 1500);
        var oldidx = null;
        if ($("#contentJournal").is(":visible")){
            rows = $("#contentJournal table").find(".displayTableEntry");
            oldidx = JS.curidx;
	    JS.curidx = rows.length - 1;
        } else if ($("#contentReport").is(":visible")) {
            rows = $("#contentReport table").find(".displayTableEntry");
            oldidx = JS.report.curidx;
	    JS.report.curidx = rows.length - 1;
        }
	rows.eq(oldidx).removeClass("displayTableEntryhighlight");
	rows.last().addClass("displayTableEntryhighlight");
	return(false);
	});

    /*
    ** Menu Shortcut Keys
    */
    /* Key - n File->New */
    $(document).bind('keydown', 'n', function(evt) {
	console.log("keydown n\n");
        $("#menuNew").click();
	return(false);
	});
    /* Key - l File->Load */
    $(document).bind('keydown', 'l', function(evt) {
	console.log("keydown l\n");
        $("#menuLoad").click();
	return(false);
	});
    /* Key - v File->Save */
    $(document).bind('keydown', 'v', function(evt) {
	console.log("keydown v\n");
        $("#menuSave").click();
	return(false);
	});

    /* Key - a Edit->Append */
    $(document).bind('keydown', 'a', function(evt) {
	console.log("keydown a\n");
        $("#menuAppend").click();
	return(false);
	});

    /* Key - i Edit->Insert */
    $(document).bind('keydown', 'i', function(evt) {
	console.log("keydown i\n");
        $("#menuInsert").click();
	return(false);
	});

    /* Key - c Edit->Change */
    $(document).bind('keyup', 'c', function(evt) {
	console.log("keyup c\n");
        evt.preventDefault();
        $("#menuChange").click();
	return(false);
	});

    /* Key - d Edit->Delete */
    $(document).bind('keydown', 'd', function(evt) {
	console.log("keydown d\n");
        $("#menuDelete").click();
	return(false);
	});


    /* Key - s Edit->Search */
    $(document).bind('keydown', 's', function(evt) {
	console.log("keydown s\n");
        if ( $("#contentReport").is(":visible") ) {
            $("#menuReportSearch").click();
        } else {
            $("#menuSearch").click();
        }
	return(false);
	});

    /* Key - y Edit->Yank */
    $(document).bind('keydown', 'y', function(evt) {
	console.log("keydown y\n");
        $("#menuYank").click();
	return(false);
	});

    /* Key - p Edit->Put */
    $(document).bind('keydown', 'p', function(evt) {
	console.log("keydown p\n");
        $("#menuPut").click();
	return(false);
	});

    /* Key - u Edit->Undo */
    $(document).bind('keydown', 'u', function(evt) {
	console.log("keydown u\n");
        //$("#menuUndo").click();
	return(false);
	});

    /* Key - q Report->Analdtl */
    $(document).bind('keydown', 'q', function(evt) {
	console.log("keydown q\n");
        // report by cract by default
        var currentCract =  $("#journal .displayTableEntry").eq(JS.curidx).find("td.cract").text();
        //$("input#dialogAnaldtlinp").val(currentCract);
        console.log(currentCract);
        JS.analdtlinp=currentCract;    //default account for Report->Analdtl
        $("#menuAnaldtl").click();
	return(false);
	});

    /* Key - h Report->Search */
    $(document).bind('keydown', 'h', function(evt) {
	console.log("keydown h\n");
        $("#menuReportSearch").click();
	return(false);
	});

    /* Key - g Report->Log */
    $(document).bind('keydown', 'g', function(evt) {
	console.log("keydown g\n");
        $("#menuLog").click();
	return(false);
	});

    /* Key - esc Report->ESC */
    $(document).bind('keydown', "esc", function(evt) {
	console.log("keydown esc\n");
        if ($("#menuESC").is(":visible")) {
            $("#menuESC").click();
	    return(false);
        }
	});

/* JE Form Processing */

/* Input field blur/focus */


    /*
    ** This function is called whenever a input field is clicked on,
    ** or put into focus.  Key actions: 
    ** - display Chart Menu when entering acctinp/cractinp field
    ** - displaying a prompt in the footer
    */
    $('#journal input').live('focus', function(evt) {
        classinp=$(this).attr('class');
        console.log("focus", classinp );
        $(this).removeClass("idleField").addClass("focusField");
        if( classinp.match("acctinp|cractinp") ) {
            acct=$(this).val();
            console.log("chartMenu",acct);
            $("#chartMenu").html(CHmenudisp(acct));
            $("#chartMenu").show();
        }

        /*
        ** Set Prompt in footer, #foot
        */
        if( classinp.match("ddinp")) {
            $("#foot").text("Enter Day (01-31)");
        }
        if( classinp.match("acctinp|cractinp")) {
            $("#foot").text("Enter 3 Digit Account (e.g. 101 or 811)");
        }
        if( classinp.match("amtinp|cramtinp")) {
            $("#foot").text("Enter Amount (e.g. 100.00 or -8101.99)");
        }
        if( classinp.match("descinp")) {
            $("#foot").text("Enter Description (25 char). ESC/ENTER to close.");
        }
    });
    /*
    ** This function is called whenever a input field is tabbed away from
    ** or another  area outside of the current input is clicked on.
    ** Key actions: 
    ** - remove Chart Menu when exiting acctinp/cractinp field
    ** - clearing the prompt in the footer
    ** - if blur from ddinp, acctinp, amtinp, cract, cramt, block blur if fields not valid.
    */
    $('#journal input').live('blur', function(evt) {
        classinp=$(this).attr('class');
        console.log("blur", classinp );
        val=$(this).val();


        // class="ddinp" or class="ddinp idleFocus" or class="ddinp xxxxFocus"
        classar = classinp.split(" ");
        for ( var i = 0; i< classar.length; i++ ) { 
        switch(classar[i])
        {
        case 'ddinp':
            console.log("blur ddinp");
            if ( ! isvalidDD(val) ) {
                evt.preventDefault();
                $("#foot").text("Day out of range. Enter 01-31");
                $(this).select();
                return;
            }
            break;
        case 'acctinp':
        case 'cractinp':
            console.log("blur acctinp or cractinp");
            if ( ! isvalidAcct (val) ) {
                evt.preventDefault();
                chartdesc = "** Invalid Code **";
                $(this).parent().next().text(chartdesc);
                $("#foot").text("Account-'"+val+"' not found in Chart of Accounts.");
                $(this).select();
                return;
            } else {
                $("#chartMenu").hide();
            }
            break;
        case 'amtinp':
            console.log("blur amtinp");
            if ( val!=="" && ! isvalidAmt (val) ) {
                evt.preventDefault();
                $("#foot").text("Amount not formated correctly.  E.g. 0.99, -100.12, 9999999.99, etc");
                $(this).select();
                return;
            }
            break;
        case 'cramtinp':
            console.log("blur cramtinp");
            if ( val!= '' && ! isvalidAmt (val) ) {
                evt.preventDefault();
                $("#foot").text("Amount not formated correctly.  E.g. 0.99, -100.12, 9999999.99, etc");
                $(this).select();
                return;
            }
            break;
        } // switch
        } // for




/***********
        if( classinp.match("ddinp") ) {
            if ( ! isvalidDD(val) ) {
                evt.preventDefault();
                $("#foot").text("Day out of range. Enter 01-31");
                $(this).select();
                return;
            }
        }
        if( classinp.match("acctinp|cractinp") ) {
            if ( ! isvalidAcct (val) ) {
                evt.preventDefault();
                chartdesc = "** Invalid Code **";
                $(this).parent().next().text(chartdesc);
                $("#foot").text("Account-'"+val+"' not found in Chart of Accounts.");
                $(this).select();
                return;
            } else {
                $("#chartMenu").hide();
            }
        }
        if( classinp.match("amtinp") ) {
              console.log("blur amtinp, val-%s",val);
            if ( ! isvalidAmt (val) ) {
                evt.preventDefault();
                $("#foot").text("Amount not formated correctly.  E.g. 0.99, -100.12, 9999999.99, etc");
                $(this).select();
                return;
            }
        }
        if( classinp.match("cramtinp") ) {
            if ( val!= '' && ! isvalidAmt (val) ) {
                evt.preventDefault();
                $("#foot").text("Amount not formated correctly.  E.g. 0.99, -100.12, 9999999.99, etc");
                $(this).select();
                return;
            }
        }
***********/
        $(this).removeClass("focusField").addClass("idleField");

        /*
        ** Clear Prompt in footer, #foot
        */
        $("#foot").text("");
    });

	
 $("#msgid").html("Scripts loaded").log("test");
 console.log ("hello world!");
  console.log ( window);
console.log("current active element-",$(document.activeElement));

/*
** Trying to get the footer bar under control.
** Assume every click on the navbar will trigger a new
** action, making the existing foot message moot.
*/
//$("#navbar").click(function(){
    //console.log("navbar-clear footer")
    //$("#foot").text("");
//})

}); // document ready
 


/* Functions */

/*
** Create General Ledger detail records from Journal Entries
** Input:  JS.nfyy content array, keys: "01" through "12"
** Output: JS.nfyy content array, keys: "00.pgl" through "12.pgl"
**
** Each Journal Entry JS.nfyy["01" - "12"].jefile[i] is formated from
** - 0131,-621,75.60;323-,Mobil
** The GL records are stored as JS.nfyy["00.pgl" - "12.pgl"].pglfile[i]
** with each JE broken into a separate record per item:
** - 0131,621,75.60,Mobil
** - 0131,323,-75.60,Mobil
**
** This spliting of items into a separate GL data structure makes reporting
** easier.  Editting is only done to the JEs.
*/

function transformMMtoPGL() {
var i,j,k;
for ( i=0; i < JS.months.length; i++ ) {
   if ( JS.nfyy[JS.months[i]] != undefined ) {
      
      var pgl = [{"mmdd":null, "acct":null, "amt":null, "desc":null}];
      var pglidx = 0;
      var jefile = JS.nfyy[JS.months[i]];
      /* Special case:  file-"00" beginning balance file */
      if  ( JS.months[i] == "00" ) {
         for (j=0; j < jefile.length; j++) {
            if(pglidx>0) {
               pgl[pglidx] = {};
            }
            pgl[pglidx].mmdd = jefile[j].mmdd;
            pgl[pglidx].acct = jefile[j].acctamt[0].acct;
            pgl[pglidx].amt = jefile[j].acctamt[0].amt;
            pgl[pglidx].desc = jefile[j].desc;
            pgl[pglidx].cract = null;
            pglidx++;
         }
         JS.nfyy[JS.months[i]+".pgl"] = pgl;
         continue;
      }

      for (j=0; j < jefile.length; j++ ) {
         var totamt = 0;
         for (k=0; k < jefile[j].acctamt.length; k++) {
            if(pglidx>0) {
               pgl[pglidx] = {};
            }
            pgl[pglidx].mmdd = jefile[j].mmdd;
            pgl[pglidx].acct = jefile[j].acctamt[k].acct;
            pgl[pglidx].amt  = jefile[j].acctamt[k].amt;
            totamt = totamt  + parseFloat(jefile[j].acctamt[k].amt);
            pgl[pglidx].desc = jefile[j].desc;
            pglidx++;
         } // for k
         pgl[pglidx] = {};
         pgl[pglidx].mmdd = jefile[j].mmdd;
         pgl[pglidx].acct = jefile[j].cract;
         totamt = -totamt;
         pgl[pglidx].amt  = (totamt.toFixed(2))+"";
         pgl[pglidx].desc = jefile[j].desc;
         pglidx++;
      } // for j
      JS.nfyy[JS.months[i]+".pgl"] = pgl;
   }  // if
} // for i
}

/*
** Merge pgl files into one sgl file, sorted by Account, Date
** Input: JS.nfyy content arry, keys: "00.pgl" through "12.pgl"
** Output: JS.nfyy content array, key: "00to12.sgl"
**
** Each pgl array corresponds to a pgl file on the server, thus
** pgl file is roughly the same as pgl content array.
**
** Each pgl file has multiple records looks like this:
** - 0131,-621,75.60;323-,Mobil
** The first two digits are the month.  The above record is from 01.pgl.
** The output sgl file is the union of all the pgl files, but sorted
** by account and date within account.  The sum of pgl file record
** counts equals the count of sgl records.
*/
function sortPGLtoSGL() {
var i;
var sgl = [{"mmdd":null, "acct":null, "amt":null, "desc":null}];

for ( i=0; i < JS.months.length; i++ ) {
   if ( JS.nfyy[JS.months[i]+".pgl"] != undefined ) {
      var pglfile = JS.nfyy[JS.months[i] + ".pgl"];
      $.merge(sgl,pglfile)
   }  // if
} // for i

/* sort by acct, mmdd */
sgl.sort(function(sglA, sglB) {
    if (sglA.acct > sglB.acct) {
        return 1;
    } else if (sglA.acct < sglB.acct) {
        return -1;
    }

    /* if acct is equal, then sort by date */
    if (sglA.mmdd > sglB.mmdd) {
        return 1;
    } else if (sglA.mmdd < sglB.mmdd) {
        return -1;
    } else {
        return 0;
    }

})

JS.nfyy["00to12.sgl"] = sgl;

}

// Replace the normal jQuery getScript function with one that supports
// debugging and which references the script files as external resources
// rather than inline.
// from: http://www.lockencreations.com/2011/07/02/cant-debug-imported-js-files-when-using-jquery-getscript/

function dynamicallyLoadJSFile(url, callback){
    JS.logHtml += "<tbody class=\"displayTableEntry\"><tr><td><pre>";
    JS.logHtml += "<br>Dynamically Load Javascript file:  -"+url;
    start = new Date().getTime();

	var head = document.getElementsByTagName("head")[0];
	var script = document.createElement("script");
	script.src = url;

	// Handle Script loading
	var done = false;

	// Attach handlers for all browsers
	script.onload = script.onreadystatechange = function(){
		if (!done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete")) {
		   done = true;

            JS.logHtml += "<br>... successful";
            end = new Date().getTime();
            diff = end - start;
            JS.logHtml += "<br>... time "+ diff;
            JS.logHtml += "</pre></td></tr></tbody>";

		   if (callback){
		      callback();
		   }
		   // Handle memory leak in IE
		   script.onload = script.onreadystatechange = null;
		}
	};
        JS.logHtml += "<br>... Loading...";
	head.appendChild(script);

	// We handle everything using the script element injection
	return undefined;
};



function isScrolledIntoView(elem)
{
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
/****
    console.log ("docViewTop", docViewTop);
    console.log ("docViewBottom", docViewBottom);
    console.log ("elemTop", elemTop);
    console.log ("elemBottom", elemBottom);
****/
    

    return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom)
      && (elemBottom <= docViewBottom) &&  (elemTop >= docViewTop) );
}
function scrolldownIfElemDoesntFullyFitInView(elem) {
    console.log("scrolldownIfElemDoesntFullyFitInView Entered");
    /* There's a postion-fixed menu bar, #head, at the top
    ** of the window.  The scrolling
    ** calculations assume a height of headHeight (nominally 18px)
    ** 7/18/11 -- Added a foot, also 18px.  Using footHeight in formula
    */
    var headHeight = $("#head").height();
    var footHeight = $("#foot").height();

    var docViewTop = $(window).scrollTop() + headHeight;
    var docViewHeight = $(window).height() - headHeight - footHeight;
    var docViewBottom = docViewTop + docViewHeight;

    var elemTop = $(elem).offset().top;
    var elemHeight = $(elem).height();
    var elemBottom = elemTop + elemHeight;

    console.log ("docViewTop", docViewTop);
    console.log ("docViewBottom", docViewBottom);
    console.log ("elemTop", elemTop);
    console.log ("elemBottom", elemBottom);

    /* if the element is does not fit in view, 
       set element top to the top of the view */
    /* or, if the element partially out of the view... */
    //if ( elemHeight >= docViewHeight || elemTop < docViewTop ) {
    if ( elemHeight >= docViewHeight || elemTop < docViewTop 
         || elemBottom > docViewBottom) {
        newTop = elemTop - headHeight;
        console.log("newTop-", newTop);
	$(window).scrollTop( newTop );

/****
        docViewTop = $(window).scrollTop() + headHeight;
        docViewBottom = docViewTop + docViewHeight;
        console.log ("docViewTop", docViewTop);
        console.log ("docViewBottom", docViewBottom);

        elemTop = $(elem).offset().top;
        elemBottom = elemTop + elemHeight;
        console.log ("elemTop", elemTop);
        console.log ("elemBottom", elemBottom);
****/
    }

}



function scrollupIfElemDoesntFullyFitInView(elem, animateTime) {
    /* Invoke the scrollTop function to make the selected elem
    ** fully visible.  There are cases where you want to scrolling
    ** to be slowed (e.g. form input vs up/down arrow).
    ** If smoothing is needed, use animateTime to set the speed
    */
    console.log("scrollupIfElemDoesntFullyFitInView Entered");

    var headHeight = $("#head").height();
    var footHeight = $("#foot").height();
    var docViewTop = $(window).scrollTop() + headHeight;
    var docViewHeight = $(window).height() - headHeight - footHeight;
    var docViewBottom = docViewTop + docViewHeight;

    var elemTop = $(elem).offset().top;
    var elemHeight = $(elem).height();
    var elemBottom = elemTop + elemHeight;


    console.log ("docViewTop", docViewTop);
    console.log ("docViewBottom", docViewBottom);
    console.log ("elemTop", elemTop);
    console.log ("elemBottom", elemBottom);

    /* if the element is does not fit in view, 
	set element top to the top of thew view 
    */
    if ( elemHeight >= docViewHeight ) {
	$(window).scrollTop( elemTop );
    }   /* if the element partially out of the view... */
    else if (elemBottom > docViewBottom ) {
	/* Scroll up so that the bottom of the element just shows in the view */

        newTop = docViewTop + elemBottom - docViewBottom - headHeight;
        //console.log("window scrollTop-", newTop);
        if (animateTime === undefined) {
	    $(window).scrollTop( newTop );
        } else {
            $('html, body').animate({ scrollTop: newTop }, animateTime);
        }
/****
        docViewTop = $(window).scrollTop() + headHeight;
        docViewBottom = docViewTop + docViewHeight;
        console.log ("docViewTop", docViewTop);
        console.log ("docViewBottom", docViewBottom);

        elemTop = $(elem).offset().top;
        elemBottom = elemTop + elemHeight;
        console.log ("elemTop", elemTop);
        console.log ("elemBottom", elemBottom);

****/
    }


}

/*
** Format elements of JS.jefile[], referred to as jefrec.
** For each array element, build a tbody composed of two or more rows.
** Row1: 01/15 621 Gas                 62.95
** Row2:       777 Fees                 1.50
** Rowcr:      323 Mobil                     Description
** where the Row2 count can be zero or more, only Row1 has date
**       and Rowcr has no amount, but description
**
** The resulting tbody is returned as an html block to be inserted\
** into the #journal table at the JS.curidx
*/
function formatJsfrecArrayToHtml ( jefrecArray ) {
    var jehtml = "";
    var i;
    //for (i in jefrecArray) {
    $.each( jefrecArray, function( i, jefrec ) {
        //jefrec = jefrecArray[i];
        tr1html = row1fn(jefrec);
        tr2html = row2fn(jefrec);
        trcrhtml = rowcrfn(jefrec);
        jehtml = jehtml + "<tbody class=\"displayTableEntry\">"+tr1html + tr2html + trcrhtml + "</tbody>";
    });
    return jehtml;
}

function row1fn(jefrec) {
	//tmpl = $("#jetemplate");
        var tmpl = JS.jetmpl;
	row1 = tmpl.find("tr.r1");
	mmslashdd = jefrec.mmdd.substring(0,2)+"/"+jefrec.mmdd.substring(2);
	row1.find(".mmslashdd").text(mmslashdd);
	row1.find(".acct").text(jefrec.acctamt[0].acct);

        var tempChartObj = JS.chart[jefrec.acctamt[0].acct];
        if (tempChartObj == undefined ) {
            tempchDesc = "** Invalid Code **";
        } else {
            tempchDesc = tempChartObj.chDesc;  
        }
	row1.find(".chartdesc").text(tempchDesc);

	row1.find(".amt").text(jefrec.acctamt[0].amt);
	return "<tr>"+row1.html()+"</tr>";
};
function row2fn(jefrec) {
	//tmpl = $("#jetemplate");
        var tmpl = JS.jetmpl;
	row2 = tmpl.find("tr.r2");
	aalen = jefrec.acctamt.length;
	row2ret = "";
	for ( i = 1; i < aalen; i++ ) {
		row2.find(".acct").text(jefrec.acctamt[i].acct);
		row2.find(".chartdesc").text(JS.chart[jefrec.acctamt[i].acct].chDesc);
		row2.find(".amt").text(jefrec.acctamt[i].amt);
		row2ret +=  "<tr>"+row2.html()+"</tr>";
	}

	return row2ret;
};
function rowcrfn(jefrec) {
	//tmpl = $("#jetemplate");
        var tmpl = JS.jetmpl;
	rowcr = tmpl.find("tr.rcr");
	rowcr.find(".cract").text(jefrec.cract);
	rowcr.find(".chartdesc").text(JS.chart[jefrec.cract].chDesc);
	rowcr.find(".desc").text(jefrec.desc);
	return "<tr>"+rowcr.html()+"</tr>";
};
/*
****************************************************************
*/


/*
** Insert a Journal Entry input form as a tbody into the #journal table
** at the JS.curidx point (before or after).
** The tbody will be class .jeInputForm.  For now, assume only one 
** .jeInputForm per #journal table.
*/

function insertJeInputFormAtCuridx( beforeOrAfter, jefrec) {

    /* beforeOrAfter = "before" or "after" default after */
    if (beforeOrAfter === "" || ( beforeOrAfter != "before" && beforeOrAfter != "after") ) {
        beforeOrAfter = "after";
    }


    tr1html = row1insertform();
    tr2html = "";
    if ( jefrec != undefined && jefrec.acctamt.length > 1 ) {
        for ( i=0; i < jefrec.acctamt.length-1 ; i++ ) {
            tr2html = tr2html + row2insertform();
        }
    }
    trcrhtml = rowcrinsertform();
    je = "<tbody class=\"jeInputForm\">"+tr1html + tr2html + trcrhtml +  "</tbody>";
    if ( JS.jecnt == 0) {
        $('table#journal').append(je);
        newjournalEntry = $("#journal tbody");
    } else { 
        curjournalEntry = $("#journal .displayTableEntry").eq(JS.curidx);
        curjournalEntry.removeClass("displayTableEntryhighlight");
        if ( beforeOrAfter == "after") {
            curjournalEntry.after(je);
            newjournalEntry = curjournalEntry.next();
        } else {
            curjournalEntry.before(je);
            newjournalEntry = curjournalEntry.prev();
        }
    }
    if (jefrec != undefined ) {
        newjournalEntry.find(".ddinp").attr("value",jefrec.mmdd.substr(2));
        newjournalEntry.find(".cractinp").attr("value",jefrec.cract);
        newjournalEntry.find(".cract").next().text(JS.chart[jefrec.cract].chDesc);
        newjournalEntry.find(".cramtinp").attr("value",jefrec.cramt);
        newjournalEntry.find(".descinp").attr("value",jefrec.desc);
        for (i=0; i < jefrec.acctamt.length; i++ ) {
            curtr = newjournalEntry.find("tr").eq(i);
            curtr.find(".acctinp").attr("value",jefrec.acctamt[i].acct);
            curtr.find(".acct").next().text(JS.chart[jefrec.acctamt[i].acct].chDesc);
            curtr.find(".amtinp").attr("value",jefrec.acctamt[i].amt);
        }
    }
    scrollupIfElemDoesntFullyFitInView(newjournalEntry,300);
    JS.inpfields = $('.jeInputForm input');
    $('.jeInputForm input').addClass("idleField");
    $("#contentJournal table :input[type='text']:enabled:first").click().focus();
    JS.jefileChanged = true;
    JS.recordsAdded++;
}
function row1insertform() {
	//tmplform = $("#jeformtemplate");
        var tmplform = JS.jeformtmpl;
	row1 = tmplform.find("tr.r1");
	mmslash = JS.mm +"/";
	row1.find(".mmslash").text(mmslash);
        row1.find(".acctinp").val("");
        row1.find(".amtinp").val("");
	row1.find(".chartdesc").text("");
	return "<tr>"+row1.html()+"</tr>";
};
function row2insertform() {
	//row2 = $('#jeformtemplate tr.r2');  
        var tmplform = JS.jeformtmpl;
	row2 = tmplform.find("tr.r2");
	row2.find(".acctinp").val("");
	row2.find(".chartdesc").text("");
	row2.find(".amtinp").val("");
	return "<tr>"+row2.html()+"</tr>";
};

function rowcrinsertform() {
	//tmpl = $("#jeformtemplate");
        var tmpl = JS.jeformtmpl;
	rowcr = tmpl.find("tr.rcr");
	rowcr.find(".cractinp").val("");
	rowcr.find(".cramtinp").val("");
	rowcr.find(".chartdesc").text("");
	return "<tr>"+rowcr.html()+"</tr>";
};
/*
** Add an additional "Row2" style row to an existing journal
** entry input form, .jeInputForm.
** This function is called when the Amount on the RowCR is non-blank.
** The new input form row is added above the RowCR row (last row);
** cract, cramt values are copied into the newly created row and 
** focus is put on cract (first input field on RowCR
*/
function  insertformabovelastrow() {
    cramt = $('.jeInputForm .cramtinp').val();
    cract = $('.jeInputForm .cractinp').val();
    lastrow = $('table:first tbody.jeInputForm tr:last').before(row2insertform());
    secondtolastrow = lastrow.prev();
    secondtolastrow.find('.amtinp').val(cramt);
    secondtolastrow.find('.acctinp').val(cract);

    chartdescobj = JS.chart[cract];
    if ( chartdescobj == undefined ) {
        chartdesc = "** Invalid Code **";
    } else {
        chartdesc = chartdescobj.chDesc;
    }
    if ( chartdesc != "** Invalid Code **" ) {
        secondtolastrow.find(".chartdesc").text(chartdesc);
    }

    lastrow.find('.cractinp').val("");
    lastrow.find('.cramtinp').val("");
    lastrow.find('.chartdesc').text("");
    JS.inpfields = $('.jeInputForm input');
}

/*
****************************************************************
*/



function addJeInputFormToJEfile() {

    /* Replace the tbody with class jeInputForm 
    ** with a journal entry, class journalEntry
    */
    var jefrec = {"mmdd":null, "cract":null, "cramt":null, "desc":null,
                     "acctamt": [{"acct":null, "amt":null }] };
    /*
    ** Map the fields in jeInputForm to 
    ** the jefrec object.  THis is the same data
    ** structure used by the JSON input.  JS.jefile[] array
    ** elements are jefrec objects.
    */
    jeinp = $('.jeInputForm');
    jefrec.mmdd = jeinp.find('.mmslash').text().substr(0,2)+ jeinp.find('.ddinp').val();
    jefrec.cract = jeinp.find('.cractinp').val();
    jefrec.cramt = jeinp.find('.cramtinp').val();
    jefrec.desc = jeinp.find('.descinp').val();
    inputItemCnt = jeinp.find('tr').length;
    for (i=0; i<inputItemCnt-1; i++ ) {
        jefrec.acctamt[i] = {"acct":null, "amt":null};
        jefrec.acctamt[i].acct = jeinp.find('.acctinp:eq('+i+')').val();
        jefrec.acctamt[i].amt = jeinp.find('.amtinp:eq('+i+')').val();
    }

   
    /*
    ** Create a table tbody html code block. class journalEntry
    */
    tr1html = row1fn(jefrec);
    tr2html = row2fn(jefrec);
    trcrhtml = rowcrfn(jefrec);
    je = "<tbody class=\"displayTableEntry\">"+tr1html + tr2html + trcrhtml + "</tbody>";

    /* 
    ** Depending on whether the journal table is empty or not,
    ** replace the .jeInputForm tbody with the new .journalEntry tbody
    */
    if ( JS.jecnt == 0 ) {
        $("tbody.jeInputForm").remove();
        $("table#journal").append(je);
        JS.jefile = [];
        JS.jefile[0] = null;
        JS.jefile[JS.jecnt] = jefrec;
        JS.jecnt = 1;
        JS.curidx = 0;
        $("table#journal .displayTableEntry").first().addClass("displayTableEntryhighlight");
    } else {
        curjournalEntry = $("tbody.jeInputForm");
        newje = curjournalEntry.after(je).next();
        newje.addClass("displayTableEntryhighlight");
        newje.attr("tabindex",-1).focus();
        $("tbody.jeInputForm").remove();
        JS.curidx = newje.parent().children().index(newje);
        JS.jecnt++;
        // JS.jefile[JS.curidx] <-- jefrec
        JS.jefile.splice(JS.curidx,0,jefrec);
    }
        

}


/*
** Chartmenu Display.
** Generate contents for the #chartMenu based on act.
** In a psuedo-dropdown style, generate contents from JS.chart[]
** based on the number of characters in act.
*/

function CHmenudisp(act) {
    var i, actlen, menustr;
    menustr = "";
    actlen = act.length;
    for (i in JS.chart) {
        if ( actlen < 1 ) {
            if (i.length == 1) {
                menustr += i+' '+JS.chart[i].chDesc+'<br>';
            }
        }
        if ( actlen == 1 ) {
            if ((i.length == 1 || i.length == 2) && i.charAt(0)== act) {
                menustr += i+' '+JS.chart[i].chDesc+'<br>';
            }
        }
        if ( actlen == 2 || actlen == 3) {
            if ((i.length == 2 || i.length == 3) 
                && i.substr(0,2) == act.substr(0,2) ) {
                menustr += i+' '+JS.chart[i].chDesc+'<br>';
            }
        }

    }
    menustr = menustr.substr(0,menustr.length-4);
    return menustr;
}



/*
** Validation function
*/
function isinteger(val)
{

    if ( val.charAt(0) == '-' ) {
	return isalldigits( val.substr(1) );
    } else {
        return isalldigits( val );
    }

}
function isalldigits(val)
{
    for ( var i = 0; i < val.length; i++) {

	if ( val.charAt(i) < '0' || val.charAt(i) > '9' ) {
           return false;
        }
    }
    return true;
}
function isvalidDD ( val ) {
    if (val.length != 2 || isNaN(val[0]) || isNaN(val[1]) ) return false;
    numdate = parseInt(val,10);
    if (numdate >=1 && numdate <=31) {
        return true;
    } else {
        return false;
    }
}
function isvalidAcct ( val ) {
    /* This function assumes:
    ** Acct is 3 characters
    ** - val[0] 1-9, val[1] 1-2
    ** - val[2] can be 1-9 or a-z
    ** val is found in chart of accounts
    ** and has a defined description
    */
    if (val.length != 3 || isNaN(val[0]) || isNaN(val[1]) ) return false;
    if (!(val[2]>="0"&&val[2]<="9" || val[2]>="a"&&val[2]<="z") ) return false;


    if (JS.chart[val] !== undefined && JS.chart[val].chDesc !== undefined) {
        return true;
    } else {
        return false;
    }



}
function isvalidAmt ( val ) {
    /* This function assumes:
    ** Amount is %-7.2d format
    ** min: 0.00, always require 1 digit to the left of decimal
    **  - always two digits after decimal
    ** max: -9999999.99
    */
    vallen = val.length;
    if (vallen >= 3 
       && val.substr(vallen-3,1)=='.' 
       && !isNaN(val.substr(vallen-2))
       && isinteger(val.substr(0, vallen-3)) === true) {
       return true;
    } else {
       return false;
    }
}


/*
** After a dialog box closes, restore the focus to the "body" element.  This
** fixes the keystroke events that seem to disappear after every dialog box transaction.
*/

$("body").attr("tabindex",-1).focus();
//$("[id^=dialog]").not("[id$=Error]")
$("[id^=dialog].ui-dialog-content")
    .live( "dialogclose", function(event, ui) {
        console.log("dialogbeforeclose");
        curjournalEntry = $("#journal .displayTableEntry").eq(JS.curidx);
        curjournalEntry.attr("tabindex",-1).focus();
    });

console.log("current active element-",$(document.activeElement));
