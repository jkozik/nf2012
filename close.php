<?php

echo "close: \n";
echo "This script closes the current year by creating\n";
echo "a new beginning balance file new00.\n";
echo "Assuming closing year-\$year\n";
echo "1. Import all JE files (00, 01, ..., 12)\n";
echo "2. Create file nf/YY+1/new00\n";
echo "3. The new00 file must be manually renamed 00\n";
echo "Only write new00 file if the \$year+1 directory exists,\n";
echo "and it contains a chart file\n";



/*
** Following block of code handles command line options
** Code Snipet and design idea for processing command line arguments came from
** http://www.sitepoint.com/php-command-line-1-3/
**  - usage: close -y05 -f/home/public_html/nf/
**  - usage: close --YEAR=05 --F=/home/public_html/nf/
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
echo "usage: close -y05 -f/home/public_html/nf/\n";
echo "usage: close --YEAR=05 --F=/home/public_html/nf/\n";
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


/*
** Set key global variables:  $year and $NFROOT
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
} else {
    // $NFROOT = "c:/nf/";
    $NFROOT = "/home/nf/public_html/nf/";
}
echo "Command lines variables:  clYEAR-$clYEAR, clF=$clF\n";
echo "Using root=$NFROOT, year=$year\n";


$mm = '';
//$year = '05';
$months = array ("00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12");

echo "usage: close <no command line args>  use environment variables YEAR and F\n";
echo "usage: close -y05 -f/home/public_html/nf/\n";
echo "usage: close --YEAR=05 --F=/home/public_html/nf/\n";


/*
** Pregl: format working files to help with General Ledger style reporting.
** close: Create a beginning balance file for next year
** Input:  Journal Entry input files
** - JE files:  00, 01, 02, ..., 12 (generically, MM files)
** - in the original dos program this program used MM.sgl files. No longer used.
** - Directory:  NFROOT-"c:/nf/root/" or "/home/nf/public_html/nf/"  note: ends with slash
** -             $year-"10", "11", ... 
** - all JE files are stored nf/YY/MM
** - only files from $year are processed.  No other year directory is read/written.
** - only process months that have been created. It is ok to run report in July.
**
** Output: new00 file in nf/YY+1/ directory
** - 00 is special.  It is carry-over beginning balances created at the 
**   close of the previous year.
** - new00 on purpose.  The program will not over write an existing 00 file.
** - the new00 file must be manually renamed to 00.
** - The fear is that new00 might have some bad numbers.
** Example output:
** For each capital account (100-500), calulate the year end sum
** - 0000,101,15195.21,Balance Forward
** For each income/expense account, (600-800)
** - output no record.  The Balance Forward for this is zero by definition
** - sum all of the income accounts into one varialbe, incsumcr
** - sum all of the expense accounts into one variable, insumdr
** - calculate an annual Income Summar account number 50X
**   0000,50X,incsumcr
**   0000,50X,incsumdr
** - this puts some history of annual income and expenses into the historical 00 file
**
** Auditing Rules:
** - The sum of all of the 00 amounts should be zero,
**   but due to historical round erros is closer to 0.04
** - The 50X records are new, and won't be found in chart, add them manually!
** - Highly recommend doing a diff new00 00; if you have to reclose a year,
**   the changes should be expect.  If you make one change, only two 00 records
**   should show a change.
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

/* Calculate next year's directory,  YY+1 */
if ($year == "99") {
    $yearpp = "00";
} else {
    $yearpp = sprintf("%02d",$year+1);
}
echo "yearpp=$yearpp\n";
$nextyeardir = $NFROOT.$yearpp;

/* Verify that YY+1 directory exists */
if ( !is_dir( $nextyeardir ) ) {
    echo "Directory $nextyeardir does not exisit.\n";
    echo "Need to run mkchart first\n";
    echo "Exiting.\n";
    echo "status=500,message=Directory $nextyeardir does not exisit. Run Mkchart.\n";
    exit(2);
}


/* Verify that nf/YY+1/chart exists */
$nextyearchartfilename = $nextyeardir."/chart";
if ( !file_exists ($nextyearchartfilename) ) {
    echo "$nextyearchartfilename does not exist.\n";
    echo "Need to run mkchart first\n";
    echo "Exiting.\n";
    echo "status=500,message=$nextyearchartfilename does not exist. Run Mkchart.\n";
    exit(3);
}



/*
** GET all existing MMs in a year: 00, 01, 02, 03, ..., 12
** Put all the jefiles into a big object, $JSnnyy
** 1. Read jefile into $jefileLines
**    - 0131,-140,100.00;777,1.50;101-,ATM
** 2. Convert each line into JSON
** {"line":"0131,-140,100.00;777,1.50;101-,ATM","mmdd":"0131","acctamt":[{"acct":"104","amt":"100.00"}, {"acct":"777","amt","1.50"}],"cract":"101","desc":"ATM"}]
**
** 3. Map JSON into the data structure/object JSnnyy
**    - JSnnyy->{"01"} holds all the data for the jefile 01
**    - JSnnyy->{"01"}->[0] holds the data for the first line of jefile 01
**
*/
    $JSnnyyjson = "{";
    foreach( $months as $m ) {
        $jefileFileName = $NFROOT.$year."/".$m;
        if ( file_exists( $jefileFileName ) ) {
            $jefileLines = file( $jefileFileName, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
            if ( $jefileLines == FALSE ) continue;
            if ( $m != "00" ) { $JSnnyyjson .= ","; };
            $JSnnyyjson .= "\"".$m."\":[\n";
            $JSnnyyjson .= jefiletojson( $jefileLines );
            $JSnnyyjson .= "]\n";
        }
    }
    $JSnnyyjson .= "}";

$JSnnyy = json_decode($JSnnyyjson);

/*
** All the jefiles from nf/YY/MM (00, 01, 02...)
** have been read into the PHP data structure JSnnyy, where
** JSnnyy is an object with arrays for each MM files.
** For each month that is found in JSnnyy, create pgl file
** (this used to be done by pregl)
** - 00.pgl, 01.pgl, ...
** Input: $JSnnyy->{00, 01, ..., 12}
** Output: $totamt[] with key equal to each $acct 
**         e.g. $totamt["101"], $totamt["304"], etc
**         Note:  Only balance sheet accounts get carried over
**         e.g. $acct <= 500
**         $incsumdr - sum of all expenses (600-700)
**         $incsumcr - sum of all income   (800)
*/


$incsumcr = 0;
$incsumdr = 0;
$totalnew00 = 0; // this total is kept for auditing purposes, only
for ($i=0; $i<13; $i++) {
   if( isset($JSnnyy->{$months[$i]}) ){
       $jefile = $JSnnyy->{$months[$i]};
       $pglfile = transformMMtoPGL($jefile);
       echo $months[$i]." / ".count($jefile)." / ".count($pglfile)."\n";
       for( $j=0; $j<count($pglfile); $j++ ) {
            $acctamt = $pglfile[$j]->acctamt;
            $acct    = $acctamt[0]->acct;
            $amt     = $acctamt[0]->amt;
            $totalnew00 = $totalnew00 + $amt;
            /* Balance Sheet Accounts -> $totamt */
            if( +$acct[0] <= 5 ) {
                if (!isset($totamt[$acct])) {
                    $totamt[$acct] = 0;
                }
                /*
                ** Main point of this script: accumulate totals by $acct
                */
                $totamt[$acct] = $totamt[$acct] + $amt;

            /* Sum all expenses */
            } else if( $acct[0]=="6" || $acct[0]=="7" ) {
                $incsumdr = $incsumdr + $amt;

            /* Sum all income */
            } else if ( $acct[0]=="8" ) {
                $incsumcr = $incsumcr + $amt;
            }
       }
   }
}

$new00filename = $nextyeardir."/new00";

$new00idx=0;
foreach( $totamt as $acct => $amt ) {
    if( sprintf("%0.2f",$amt) != "0.00") {
        $new00filelines[$new00idx++] = sprintf("0000,%s,%0.2f,Balance Forward".PHP_EOL, $acct, +$amt);
    }
}

usort($new00filelines, "strcmp");

/* Add records for Income Summary, account 50X */
$new00filelines[$new00idx++] = sprintf("0000,%s,%0.2f,Balance Forward".PHP_EOL, yrtoisacct($year), +$incsumcr);
$new00filelines[$new00idx++] = sprintf("0000,%s,%0.2f,Balance Forward".PHP_EOL, yrtoisacct($year), +$incsumdr);


//var_dump($new00filelines);
$ret = file_put_contents($new00filename,$new00filelines);
if ($ret==FALSE) {
    echo "Unable to write new00.\n  Exiting.\n";
    echo "status=500,message=Unable to write new00.\n";
    exit(4);
} else {
    echo "new00 successfully written.\n";
    echo " count-".count($new00filelines)."\n";
    echo " sum-".sprintf("%0.2f",$totalnew00)."\n";
    echo "status=200,message=close: created $new00filename.\n";
    exit(0);
}
exit;

/*
** FUNCTIONS
*/

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


/*
** Transform monthly journal entry data file, $jefile
** into data structure where each Journal Entry item
** is split into its own general ledger item.  At
** the very least each JE maps into two PGL entries.
** The exception is the beginning balance items stored in the
** JE file called 00.
**
** Example input:
** JEfile 01,... 12
** - 0131,-631,100.00;101-,Jewel
** maps to 01.pgl file
** - 0131,631,100.00,Jewel
** - 0131,631,-100.00,Jewel
**
** The JEfile is mapped into an array of objects.
** The output PGLfile is likewise mapped into an array of objects,
** but the PGLfile does not use the cract field, just acctamt[0] entries.
*/

function transformMMtoPGL($jefile) {

    $pglfile[0] = $jefile[0];
    $pglfile[0]->{"line"} = "";
    $pglidx = 0;
    for ($i=0; $i<count($jefile); $i++) {
/****
        $mmdd = $jefile[$i]->{"mmdd"};
        $cract = $jefile[$i]->{"cract"};
        $desc = $jefile[$i]->{"desc"};
        $acctamt = $jefile[$i]->{"acctamt"};
****/
        $mmdd = $jefile[$i]->mmdd;
        $cract = $jefile[$i]->cract;
        $desc = $jefile[$i]->desc;
        $acctamt = $jefile[$i]->acctamt;
        $totamt = 0;
        for ($j=0; $j<count($acctamt); $j++) {
            $pglfile[$pglidx]->{"mmdd"} = $mmdd;
            $pglfile[$pglidx]->{"cract"} = "";
            $pglfile[$pglidx]->{"desc"} = $desc;
            $acct = $acctamt[$j]->{"acct"};
            $amt = $acctamt[$j]->{"amt"};
            $totamt = $totamt + $amt;
            $pglfile[$pglidx]->{"acctamt"}[0]->{"acct"} = $acct;
            $pglfile[$pglidx]->{"acctamt"}[0]->{"amt"} = $amt;
            $pglidx++;
        }
        if ( isset($cract) && strlen($cract)==3 ) {
            $pglfile[$pglidx]->{"mmdd"} = $mmdd;
            $pglfile[$pglidx]->{"cract"} = $cract;
            $pglfile[$pglidx]->{"desc"} = $desc;
            $pglfile[$pglidx]->{"acctamt"}[0]->{"acct"} = $cract;
            $pglfile[$pglidx]->{"acctamt"}[0]->{"amt"} = number_format (-1*$totamt, 2, ".", "");
            $pglidx++;
        }
    } /* for */
    return $pglfile;


} /* function */
//$jefile =  $JSnnyy->{"01"} ;
//var_dump( $jefile );

/************
var_dump( $JSnnyy->{"00"}[0] );
var_dump( $JSnnyy->{"00"}[0]->{"line"} );
var_dump( $JSnnyy->{"00"}[0]->{"mmdd"} );
var_dump( $JSnnyy->{"00"}[0]->{"cract"} );
var_dump( $JSnnyy->{"00"}[0]->{"desc"} );
//var_dump( $JSnnyy->{"00"}[0]->{"acctamt"} );
var_dump( $JSnnyy->{"00"}[0]->{"acctamt"}[0] );
var_dump( $JSnnyy->{"00"}[0]->{"acctamt"}[0]->{"acct"} );
var_dump( $JSnnyy->{"00"}[0]->{"acctamt"}[0]->{"amt"} );
$jefile =  $JSnnyy->{"01"} ;
var_dump( $jefile );
$jefrec = $jefile[0];
var_dump( $jefrec );
************/
exit;


/*
** For each line in the jefile[]:
** jefile[i]: 0501,-101,150.00;777,1.50;101;-description
** json output: {"mmdd":,"0501","actamt":{{"acct":"101","amt":"150.00"},...},"cract":"101","desc":"description"}
**
** Special case:  Beginning Balance file - "00"
** 0000,101,12756.02,Balance Forward
** json output: {"mmdd":"0000", "actamt":{{"acct":"101","amt":"12756.02"}},"cract":null,"desc":"Balance Forward"}
**
*/
function jefiletojson( $jefileLines ) {
    $jsonstr = "";

/* If file is "00", a balance forward file... */

$line = rtrim($jefileLines[0]);
if (preg_match("/^0000,\d\d[0-9a-z],.*\.\d\d,Balance Forward$/", $line)) {
   for ($i=0; $i<count($jefileLines); $i++) {
      if($i!=0) $jsonstr .= ",";
      $line = rtrim($jefileLines[$i]);
      list( $mmdd, $acct, $amt, $desc ) = explode(",", $line);
      $jsonstr .= "{";
      $jsonstr .= "\"line\":\"$line\",\n";
      $jsonstr .= "\"mmdd\":\"$mmdd\",";
      $jsonstr .= "\"acctamt\":[{\"acct\":\"$acct\",\"amt\":\"$amt\"}],";
      $jsonstr .= "\"cract\":null,";
      $jsonstr .= "\"desc\":\"$desc\"";
      $jsonstr .= "}\n";
   }
   return $jsonstr;
}


/* Otherwise, assume normal monthly Journal files */

    for ($i=0; $i<count($jefileLines); $i++) {
        if($i!=0) $jsonstr .= ",";
        $line = rtrim($jefileLines[$i]);
        if (!preg_match("/^[01]\d[0123]\d,-(\d\d[0-9a-z],(-\d+\.\d\d;|\d+\.\d\d;))+\d\d[0-9a-z]-(,.*$|$)/", $line)) {
            echo $line." <--?\n";
        }
        $desc = jefileParseDesc($line);
        $mmdd = substr($line,0,4);
        $cract = substr($line,strpos($line,";")+1,3);
        $cract = preg_replace('/^(.*;)(\d\d[a-z0-9])(-.*$)/','${2}',$line);
        $acctamt = jefileParseAcctAmt($line);
        $jsonstr .= "{";
          $jsonstr .= "\"line\":\"$line\",\n";
          $jsonstr .= "\"mmdd\":\"$mmdd\",";
          $jsonstr .= "\"acctamt\":$acctamt," ;
          $jsonstr .= "\"cract\":\"$cract\",";
          $jsonstr .= "\"desc\":\"$desc\"";;
        $jsonstr .= "}" .  "\n";
    }
    return $jsonstr;
}


/*
** Parse the Account / Amount pairs from the current jefile[] line
*/

function jefileParseAcctAmt($line) {

$begpos = strpos($line,",-");
$line = substr($line, $begpos+2);
$lineJson =  "[";
for ($aaidx = 0; $line{3}==",";$aaidx++) {
    $eon = strpos($line,";");
    $acct = substr($line, 0, 3);
    $amt = substr($line, 4, $eon-4);
    if ($aaidx != 0) {$lineJson .= ",";};
    $lineJson .=  "{". "\"acct\":"."\"$acct\","."\"amt\":"."\"$amt\"". "}";
    $line = substr($line, $eon+1);

}
$lineJson .=  "]";  // close acctamt array of objects

return $lineJson;
} // function AcctAmt

function jefileParseDesc($line) {
  $len=strlen($line);
  if ($line[$len-1]==";" && $line[$len-1]=="-") {
          return "";
  } else {
          $sod = strpos($line,"-,");
          if ($sod !== false) {
                  return substr($line, $sod+2);
          } else {
                  return "";
          }
  }

}



?>
