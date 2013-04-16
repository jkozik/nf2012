<?php


/*
** php diff.php file1 file2
** This is a pretty normal diff script, except the output
** is HTML tagged where the different inserts and deletes
** are located.  
** The script requires that the script runs with two arguments
** with each being an existing, readable file.
**
** This script can be run from a command line, but it was written
** to be executed from the rest php script.  Since the Win7 diff
** command and the Linux diff command are different, I run this script
** for portability.
**
** In theory, I could add some fancy CSS to my web page, but for 
** now the default styling is fine.
**
** php script built from library supplied by Raymond Hill
** http://www.raymondhill.net/finediff/finediff-code.php
*/

require_once 'finediff-code.php';

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

// Convert the arguments to options - check for the first argument
if ( realpath($_SERVER['argv'][0]) == __FILE__ ) {
$options = Console_Getopt::getOpt($args,$short_opts,$long_opts);
} else {
$options = Console_Getopt::getOpt2($args,$short_opts,$long_opts);
}
// Check the options are valid
if (PEAR::isError($options)) {
fwrite(STDERR,$options->getMessage()."\n");
echo "invalid options.  exiting...\n";
exit(INVALID_OPTION);
}
//print_r($options);

$dashitems = $options[0];
if (sizeof($dashitems)>0) {
    foreach ($dashitems as $flag) {
     } // end of foreach
} // end of if size of


$filenameargs = $options[1];
//print_r($filenameargs);
$filename1 = "";
$filename2 = "";

$retval = 0;
if ( $filenameargs[0] === undefined || $filenameargs[0] == "" ) {
    echo "diff: missing operand after diff\n";
    $retval = 2;
} else {
    $filename1 = $filenameargs[0];
    if ( $filenameargs[1] === undefinded ) {
        echo "diff: missing operand after '$filename1\n";
        $retval = 2;
    } else {
        $filename2 = $filenameargs[1];
        if ( !file_exists($filename1) ) {
            echo "diff: $filename1: No such file or directory\n";
            $retval = 2;
        }
        if ( $filename2 != "" && !file_exists($filename2) ) {
            echo "diff: $filename2: No such file or directory\n";
            $retval = 2;
        }
    }
}
if ( $retval == 2 ) {
    echo "Exiting.\n";
    echo "status=500,message=File arguments missing or files not found.\n";
    exit(1);
}


/*
** End of command line argument parsing
*/

$lines1 = file_get_contents( $filename1 );
$lines2 = file_get_contents( $filename2 );

$opcodes = FineDiff::getDiffOpcodes($lines1, $lines2);

// $opcodes = FineDiff::getDiffOpcodes($lines1, $lines2, FineDiff::$wordGranularity  /* , default granularity is set to character */);
$htmldiff = FineDiff::renderDiffToHTMLFromOpcodes($lines1, $opcodes);

echo $htmldiff."\n";

?>

