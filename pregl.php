<?php


if ( getenv("YEAR")!="" ) {
    $year = getenv("YEAR");
} else {
    $year = "05";
}

if ( getenv("F")=="nf" ) {
    $NFROOT = "c:/nf/";
} else if ( getenv("F")!="" ) {
    $NFROOT = getenv("F");
} else {
    /* $NFROOT = "c:/nf/"; */
    $NFROOT = "/home/nf/public_html/nf/";
}
echo "year-$year NFROOT-$NFROOT\n";

/* Verify that YY directory exists */
$yeardir = $NFROOT.$year;
if ( !is_dir( $yeardir ) ) {
    echo "Directory $yeardir does not exisit.\n";
    echo "The YEAR environment variable set incorrectly?\n";
    echo "e.g. set YEAR=11  not set YEAR=\"11\"\n";
    echo "Exiting.\n";
    exit;
}


$mm = '';
//$year = '05';
$months = array ("00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12");

echo "Pregl: \n";
echo "1. Import all JE files (00, 01, ..., 12)\n";
echo "2. Create General Ledger files for each month\n";
echo "   - Retaining input order:  00.pgl, 01.pgl, ...\n";
echo "   - Sorted by acct/date:    00.sgl, 01.sgl, ...\n";
echo "Only write gl files if original JE file changes\n";
echo "Using root=$NFROOT, year=$year\n";

/*
** Pregl: format working files to help with General Ledger style reporting.
** Input:  Journal Entry input files 
** - JE files:  00, 01, 02, ..., 12 (generically, MM files)
** - 00 is special.  It is carry-over beginning balances created at the 
**   close of the previous year.
** - Directory:  NFROOT-"c:/nf/root/" or "/home/nf/public_html/nf/"  note: ends with slash
** -             $year-"10", "11", ... 
** - all JE files are stored nf/YY/MM
** - only files from $year are processed.  No other year directory is read/written.
** - only process months that have been created.  In July, do not try to create 08.pgl, 09.pgl, ...
**
** Output: JE broken into separate lines for each JE item
** - PGL files: 00.pgl, 01.pgl, 02.pgl, ... 
**   A PGL file has at least twice as many lines as a JE file
**   PGL retains the original order of JE file
** - SGL files: 00.sgl, 01.sgl, 03.sgl, ...
**   An SGL file is the same contents as a PGL file except sorted acct/mmdd (Account/Date)
**
** Example input:
** JEfile 01
** - 0131,-631,100.00;101-,Jewel
** maps to 01.pgl file
** - 0131,631,100.00,Jewel
** - 0131,631,-100.00,Jewel
**
** Auditing Rules:
** - PGL record count 2X or more JE
** - SGL record count == PGL count
** - Sum of amt in PGL and SGL files == 0
** - Sum of amt in 00.pgl is slightly off.  Historical rounding errors.
** - All accounts must exist in chart file
*/


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
            $jefileLines = file( $jefileFileName );
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
** JSnnyy is an object with arrays for each MM file.
** For each month that is found in JSnnyy, create pgl and sgl files:
** - 00.pgl, 01.pgl, ...
** - 00.sgl, 01.sgl, ...
** But only write them if the MM file has been updated.
*/

for ($i=0; $i<13; $i++) {
   if( isset($JSnnyy->{$months[$i]}) ){
       $jefile = $JSnnyy->{$months[$i]};
       $pglfile = transformMMtoPGL($jefile);
       $sglfile = sortPGLAcctMmdd($pglfile);
       $pglfileMM =  glfileArrayofObjectsToMMfile($pglfile);
       $sglfileMM =  glfileArrayofObjectsToMMfile($sglfile);
       echo $months[$i]." / ".count($jefile)." / ".count($pglfile)." / ".count($sglfile)."\n";


       /*
       ** Write pgl and sgl files, only if existing gl files are older than je
       ** if 01 changed, rewrite 01.pgl, 01.sgl
       ** use filemtime() to test timestamps
       */
       $jefilename = $NFROOT.$year."/".$months[$i];
       $pglfilename = $NFROOT.$year."/".$months[$i]."n.pgl";
       if (file_exists($pglfilename) === FALSE 
        || file_exists($pglfilename) && filemtime($jefilename)>filemtime($pglfilename)) {
           $ret = file_put_contents($pglfilename, $pglfileMM);
           echo "writing ".$months[$i]."n.pgl\n";
           if ($ret == FALSE) {
               echo "Unable to write $pglfilename\n";
           }
       }
       $sglfilename = $NFROOT.$year."/".$months[$i]."n.sgl";
       if (file_exists($sglfilename) === FALSE 
        || file_exists($sglfilename) && filemtime($jefilename)>filemtime($sglfilename)) {
           $ret = file_put_contents($sglfilename, $sglfileMM);
           echo "writing ".$months[$i]."n.sgl\n";
           if ($ret == FALSE) {
               echo "Unable to write $sglfilename\n";
           }
       }

   }
}

exit;

/*
** FUNCTIONS
*/



/*
** Sort PGL file for General Ledger report.
** Sorted by Account and Date within Account
*/
function cmp($pglrecA, $pglrecB)
{
/****
    $acctA = $pglrecA->{"acctamt"}[0]->{"acct"};
    $acctB = $pglrecB->{"acctamt"}[0]->{"acct"};
    $mmddA  = $pglrecA->{"mmdd"};
    $mmddB  = $pglrecB->{"mmdd"};
****/
    $acctA = $pglrecA->acctamt[0]->acct;
    $acctB = $pglrecB->acctamt[0]->acct;
    $mmddA  = $pglrecA->mmdd;
    $mmddB  = $pglrecB->mmdd;


    $acctcmp = strcmp( $acctA, $acctB );
    if ( $acctcmp != 0 ) {
        return $acctcmp;
    }

    $mmddcmp = strcmp( $mmddA, $mmddB );
    return $mmddcmp;
}



function sortPGLAcctMmdd($pglfile) {

    $sglfile = $pglfile;
    usort($sglfile, "cmp");
    return $sglfile;

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
** Convert the $glfile array of objects into the jefile format:
** 
** glfileMM: 0501,101,150.00,description
*/

function glfileArrayofObjectsToMMfile($glfile) {

    $glfileMM = "";
    $totamt = 0;
    $mm = substr($glfile[0]->mmdd,0,2);
    for ($i=0; $i<count($glfile); $i++) {
        $aar = $glfile[$i]->acctamt;
        $glfileMM .= $glfile[$i]->mmdd.",";
        $glfileMM .= $aar[0]->acct.",";
        $glfileMM .= $aar[0]->amt;
        $totamt = $totamt + $aar[0]->amt;
        $desc = $glfile[$i]->desc;
        if ( $desc != "" ) {
            $glfileMM .= ",".$desc;
        }
        $glfileMM .= PHP_EOL;
    }
    //$num = number_format($totamt,2,".","");
    //echo "mm-$mm, totamt-$num\n";
    return $glfileMM;
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
