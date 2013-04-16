<?php

echo "mkchart: \n";
echo "Make chart of accounts file for new year, based on current year's file.\n";
echo "1. Verify the chart file for the current year exists.\n";
echo "2. Verify the directory for the new year exists.  If not create it.\n";
echo "3. Verify that the chart file for the new year does not exist.\n";
echo "4. Make chart file for new year.\n";
echo "The chart file has a field that indicates when an Account is new, or the account\n";
echo "number changed.  This program keeps these fields up to date.  Used to be done manually.\n";

/*
** Following block of code handles command line options
** Code Snipet and design idea for processing command line arguments came from
** http://www.sitepoint.com/php-command-line-1-3/
**  - usage: mkchart -y05 -f/home/public_html/nf/
**  - usage: mkchart --YEAR=05 --F=/home/public_html/nf/
**
** Command lines are meant to over ride environment variables:
** - F    -- root folder. Typically c:/nf/ or /home/nf/public_html/nf/
** - YEAR -- current YEAR, formant YY.  mkchart creates a new chart file in
**           a new directory $F/YY+1
**
*/




// Include PEAR::Console_Getopt
require_once 'Console/Getopt.php';


// Define exit codes for errors
define('NO_ARGS',10);
define('INVALID_OPTION',11);
error_reporting(E_ALL & ~(E_STRICT | E_NOTICE));

// Reading the incoming arguments - same as $argv
$args = Console_Getopt::readPHPArgv();

// Make sure we got them (for non CLI binaries)
if (PEAR::isError($args)) {
fwrite(STDERR,$args->getMessage()."\n");
exit(NO_ARGS);
}
// Short options
// -yYY - Set year to YY.  Must be 2 digits; must be valid year
// -fnfdir/ - $NFROOT to root directory where nf files are stored.
//          - eg -f/home/nf/public_html/nf/
//          - eg -fc:/nf/
$short_opts = 'y::f::';
// Long options
$long_opts = array(
'YEAR==',
'F==',
);



// Convert the arguments to options - check for the first argument
if ( realpath($_SERVER['argv'][0]) == __FILE__ ) {
$options = Console_Getopt::getOpt($args,$short_opts,$long_opts);
} else {
$options = Console_Getopt::getOpt2($args,$short_opts,$long_opts);
}
// Check the options are valid
if (PEAR::isError($options)) {
fwrite(STDERR,$options->getMessage()."\n");
echo "usage: mkchart -y05 -f/home/public_html/nf/\n";
echo "usage: mkchart --YEAR=05 --F=/home/public_html/nf/\n";
echo "invalid options.  exiting...\n";
exit(INVALID_OPTION);
}
//print_r($options);
$dashitems = $options[0];
$clYEAR = "";
$clF = "";
if (sizeof($dashitems)>0) {
    foreach ($dashitems as $flag) {
        if ($flag[0] == 'y' || $flag[0] == '--YEAR') {
            $clYEAR=$flag[1]; 
        } else if ($flag[0] == 'f' || $flag[0] == '--F') {
            $clF=$flag[1];
        } else  {
            echo "unrecognized command line flag: $flag[0]\n";
            exit(12);
        }
     } // end of foreach
} // end of if size of

echo "clYEAR-$clYEAR, clF=$clF\n";

/*
** End of command line option parsing
*/

if ( $clYEAR!="" ) {
    $year = $clYEAR;
} else if ( getenv("YEAR")!="" ) {
    $year = getenv("YEAR");
} else {
    $year = "05";
}

if ( $clF != "" ) {
    $NFROOT = $clF;
} else if ( getenv("F")=="nf" ) {
    $NFROOT = "c:/nf/";
} else if ( getenv("F")!="" ) {
    $NFROOT = getenv("F");
} else if ( is_dir( "c:/nf/" ) ) {
    $NFROOT = "c:/nf/";;
} else if ( is_dir( "/home/nf/public_html/nf/" ) ) {
    $NFROOT = "/home/nf/public_html/nf/";
} else {
    // $NFROOT = "c:/nf/"; 
    $NFROOT = "/home/nf/public_html/nf/";
}
echo "Command lines variables:  clYEAR-$clYEAR, clF=$clF\n";
echo "Using root=$NFROOT, year=$year\n";




$mm = '';
//$year = '05';
$months = array ("00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12");

echo "usage: mkchart <no command line args>  use environment variables YEAR and F\n";
echo "usage: mkchart -y05 -f/home/public_html/nf/\n";
echo "usage: mkchart --YEAR=05 --F=/home/public_html/nf/\n";

/*
** mkchart: Create chart of accounts file for new year
** Input:  /nf/YY/chart
** - a,115,Hawthorn Credit Union,115    <- most typical.  2nd 115 means prior year value
** - a,20f,Audi A8L                     <- new entry, no prior year.  For next year, this 
**                                         wll have a ,20f added
** - a,261,CMA Equities,261,s           <- The s mean Summary account.  The Analdtl report uses
**                                         this as a special totaling flag.
** Output: /nf/YY+1/chart
** - creates directory, if does not exist
** - will not over write
** - fills in lastyearacct field
*/



/* Verify that YY directory exists */
$yeardir = $NFROOT.$year;
if ( !is_dir( $yeardir ) ) {
    echo "Directory $yeardir does not exisit.\n";
    echo "The YEAR environment variable set incorrectly?\n";
    echo "e.g. set YEAR=11  not set YEAR=\"11\"\n";
    echo "Exiting.\n";
    echo "status=404,message=Directory $yeardir does not exist.\n";
    exit(1);
}

/* Current chart file must exist */
$chartfilename = $NFROOT.$year."/chart";
if( file_exists( $chartfilename ) === FALSE ) {
    echo "$chartfilename does not exist.  Exiting.\n";
    echo "status=404,message=Chart of accounts file $chartfilename does not exist.\n";
    exit(2);
}

/* Try to open current year chart file */
$chartfilelines = file( $chartfilename );
if ( $chartfilelines == FALSE ) {
    echo "Unable to open $chartfilename. Exiting.\n";
    echo "status=500,message=Chart of accounts file $chartfilename exists but unable to open.\n";
    exit(3);
}

/* Create next year's $NFROOT folder.  E.g. $year-05, next year is 06 */
$yearpp = sprintf("%02d",$year+1);
echo "yearpp=$yearpp\n";
$nextyeardir = $NFROOT.$yearpp;
if ( !is_dir( $nextyeardir ) ) {
    echo "Creating $nextyeardir\n";
    $ret = mkdir($nextyeardir);
    if ($ret == FALSE) {
        echo "Unable to create directory.  Exiting.\n";
        echo "status=500,message=Unable to create directory $nextyeardir\n";
        exit(4);
    }
}

/* Verify that in next years directory no chart file exisits */
$nextyearchartfilename = $nextyeardir."/chart";
if ( file_exists ($nextyearchartfilename) ) {
    echo "$yearpp chart already exists.  Exiting.\n";
    echo "status=500,message=Chart file for $yearpp already exists.\n";
    exit(5);
}
echo "Creating file: $nextyearchartfilename\n";

/* loop through chart file...
** Input:  $chartfilelines
** Output: $nextyearchartfilename
** Processing:
** - verify basic formatting
** - parse out fields:
**   $tag, $acct, $desc, $lastyearacct, $subacct
** - format chart for next year:
**   a,$acct,$desc,$acct(,s)
** Note:  for next year, the lastyearacct field equals acct
*/
$sacnt = 0;
$lyacnt = 0;

/*
** The current years Debit and Credit income/expense amounts are
** captured in a year specific balance sheet account called
** and income summary account.  Each year has a unique incsum
** account starting with year 1982=501, 1983=502, 2004=50n.
** The close.php program autogenerates these two amounts and
** inserts them into the next year's beginning balance file.
** Mkchart automatically creates a new entry for this years incsumacct.
*/
$incsumacct = yrtoisacct($year);
$yrnum = intval($year);
if ( $year > "80" ) {
    $incsumdesc = "19".$year;
} else {
    $incsumdesc = "20".$year;
}

for ($i=0; $i<count($chartfilelines); $i++) {
    /*
    ** Parse each line of chartfile into PHP varables
    ** a,101,Checking,101,s
    ** $tag,$acct,$desc,$lastyearacct,$subacct
    */
    $chartline = trim($chartfilelines[$i]);
    $line = $chartline;
    /* Basic check of charfile line */
    if( !preg_match("/^a,(\d|\d\d|\d\d[0-9a-z]),[^,?]*$|(,(\d|\d\d|\d\d[0-9a-z])?)(,s$)?/",$line) ) {
        echo $line." <--?\n";
    }

    /* $subacct */
    $subacct = false;
    if ( substr($line, -2) == ",s" ) {
        $line = substr($line, 0, strlen($line)-2);
        $subacct = true;
    }
    
    /* $lastyearacct */
    /* Pulling lastyearacct off the end of the line, this lets
    ** me allow commas in the description.  
    ** (Shouldnt be there, but allow anyway)
    */
    $lastyearacct="";
    if(preg_match("/,\d\d[0-9a-z]$|,\d\d$|,\d$/",$line)) {
        $ridx = strrpos($line,",");
        $lastyearacct = substr($line, $ridx+1);
        $line = substr($line, 0, $ridx);
    }

    /* $tag, $acct, $desc */
    list( $tag, $acct, $desc ) = explode(",", $line);
    //echo $tag." ".$acct." ".$desc." ".$lastyearacct." ".($subacct ? "TRUE" : "FALSE")."\n";

    /* Look for this year's Income Summary Account (50X) */
    if ( $acct == "51" ) {

        /* Insert new Income Summary Account */
        echo "Creating new Income Summary account for $year\n";
        echo "a,$incsumacct,$incsumdesc\n";
        $nextyearchartfilelines[$i] = sprintf("a,%s,%s",$incsumacct,$incsumdesc);
        $nextyearchartfilelines[$i] = $nextyearchartfilelines[$i].PHP_EOL;
        $i++;
        $lyacnt++;
    }

    /* Create new record */
    $nextyearchartfilelines[$i] = sprintf("a,%s,%s,%s",$acct,$desc,$acct);
    if( $subacct ) {
        $sacnt++;
        $nextyearchartfilelines[$i] = $nextyearchartfilelines[$i].",s";
    }
    $nextyearchartfilelines[$i] = $nextyearchartfilelines[$i].PHP_EOL;
    if ($lastyearacct == "") { 
        $lyacnt++;
    }
    //echo $chartline."\n".$nextyearchartfilelines[$i]."\n";
    
}

/*
** Write file (should work)
*/
$ret = file_put_contents($nextyearchartfilename, $nextyearchartfilelines);
if ($ret !== FALSE) {
    echo "chart written.\n";
    echo "- record count-".count($nextyearchartfilelines)."\n";
    echo "- new accounts-$lyacnt\n";
    echo "- sub account tags-$sacnt\n";
    echo "status=200,message=mkchart: created new file $nextyearchartfilename.\n";
    exit(0);
} else {
    echo "Unable to write chart\n";
    echo "status=500,message=unable to write chart file\n";
    exit(6);
}

exit;

/*
** Convert current, $year="YY"
** - e.g. 82->501, 83->502, ...
**        91->50a, 92->50b, ...
**        00->50j, 01->50k, ..., 16->50z
** Otherwise YY->50?
*/
function yrtoisacct($year) {
    $yrnum = intval($year);
    /* 1982-1990*/
    if ($yrnum>=82 && $yrnum <=90) {
        return strval( 419+$yrnum);
    } else
    /* 1991-1999 */
    if ($yrnum>90 && $yrnum<=99) {
        $incsumacct = ord("a")+$yrnum-91;
        return sprintf("50%c", $incsumacct);
    } else
    /* 2000-2016 */
    if ($yrnum>=0 && $yrnum<=16) {
        $incsumacct = ord("a")+$yrnum+100-91;
        return sprintf("50%c", $incsumacct);
    }
    else {
        return "50?";
    }
}



?>
