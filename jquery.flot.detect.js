/*

    CSV to FLOT Converter and Dataset Detector
    Version: 0.5
   
    About:  Converts CSV Text to FLOT format (Auto Detect)
    About:  There are 3 main functions 
            1. (locate the dataset)
            2. (figure out if the data is organized by column or by row)
            3. (set the axis labels)
    
    Usage:  <script type="text/javascript" src="csv.js"></script>
    Usage:  <script type="text/javascript" src="jquery.flot.detect.js"></script>
    
    FLOT Spec: http://code.google.com/p/flot/
    CSV Specification: http://en.wikipedia.org/wiki/Comma-separated_values
    
*/

// prep (dataset[row][column]) returns [data, options]
// row 0 column 0 is the title of the graph
function CSVflot (dataset) {
  // result = [{label: dataSetLable, data: [[x,y], [x,y], ..]},]
  var result = {};
  var position = Locate(dataset);
  var direction = Direction(dataset, position);
  var label = Label(dataset, position, direction);
  result = Load(dataset, position, direction);
  return {data : result, ticks : label};
}

function Locate (dataset) {
  var location = {top : null, bottom : null, left : null, right : null};
  var top = dataset;
  location.top = Edge(top);
  location.bottom = Edge(top.slice(location.top, top.length))+location.top;
  var left = top.rotate();
  location.left = Edge(left);
  location.right = Edge(left.slice(location.left, left.length))+location.left;
  // next we check to see if the left or top most rows are the starting points
  if(location.left+1 == left.length){ 
    location.left = 0;
  }
  if(location.top+1 == top.length){
    location.top = 0;
  }
  return location;
}

// locate the dataset
function Edge(dataset){
  if(dataset.length !== 1){
    var index = 1;
    var previous = binary(dataset[index-1]);
    var primary = binary(dataset[index]);
    state = Logical("xor", previous, primary);
    if (state.diff*2 < state.length) { // if less then half the bits changed then it wasn't a real change
      return Edge(dataset.slice(1, dataset.length)) + 1;
    } 
    else {
      return index;
    }
  } else {
    return 0;
  }
}

// set access direction
function Direction (dataset, position) {
  var result = { bycolumn : false, byrow : false};
  
  //get row 0
  var row0 = getRow(dataset, position, 0);
  row0.stats();
  
  //get column 0 and compare it
  var column0 = getColumn(dataset, position, 0);
  column0.stats();
  
  //if the std Deviation of column 0 is less then row 0 then graph by column
  if(row0.medabsvariation > column0.medabsvariation) {
    result.bycolumn = true;
    result.byrow = !result.bycolumn;
    return result;
  } else {
    result.bycolumn = false;
    result.byrow = !result.bycolumn;
    return result;
  }         
}

// set tickmarks on the axis
//{xaxis : {ticks : null}, yaxis : {ticks : null}};
function Label (dataset, position, direction) {
  var column0 = position.left;
  var row0 = position.top;
  var xticks = [];
  var index = 1;
  if(direction.bycolumn) {
    if(column0 - 1 >= 0){
      column0--;
      for(var row = row0; row < dataset.length; row++){ // TODO dataset.length may need to end before the actual length
        xticks.push([index, dataset[row][column0]]); // xaxis labels are in column-1 row 1,2,3..
        index++;
      }
    } else {
        for(var row = row0; row < dataset.length; row++){ // TODO dataset.length may need to end before the actual length
          xticks.push([index, index]); // xaxis labels are in column-1 row 1,2,3..
          index++;
        }
      } 
  } else {
    if (row0 - 1 >= 0) {
      row0--;
      for(var column = column0; column < dataset[row0].length; column++){
        xticks.push([index, dataset[row0][column]]); // xaxis labels are in row-1 column 1,2,3..
        index++;
      }
    } else {
        for(var column = column0; column < dataset[row0].length; column++){
          xticks.push([index, index]); // xaxis labels are in row-1 column 1,2,3..
          index++;
        }
    }
  }
  return {xaxis : {ticks : xticks}};
}

function Load(dataset, position, direction) {
  var data = [];
  var row0 = position.top;
  var column0 = position.left;
  if(direction.bycolumn){
    for (var column = 0; column < dataset[row0].length-column0; column++) {
      var subset = {};
      subset = LoadColumn(dataset, position, column);
      data.push(subset); 
    } 
  } else {
    for (row = 0; row < dataset.length-row0; row++) { // TODO check final index dataset.length may be longer then actual dataset
      var subset = {};
      subset = LoadRow(dataset, position, row);
      data.push(subset); 
    }   
  }
  return data;
}

Array.prototype.rotate = function () {
  var rotated = [];
  var columns = 1; 
  for(var col = 0; col < columns; col++) {
    var myrow = [];
    for(var row = 0; row < this.length; row++){ // this.length is the longest column
      if(this[row].length > columns){
        columns = this[row].length;
      }
      if(this[row].length > col){
        myrow.push(this[row][col]);
      } else {
        myrow.push(null);
      }
    }
    rotated.push(myrow);
  }
  return rotated;
}

function LoadColumn (dataset, position, column) {
  var row0 = position.top;
  var column0 = position.left;
  var data = {};
  var subset = [];
  var index = 1;
  for (row = row0; row < dataset.length; row++){
    subset.push([index, dataset[row][column + column0]]);
    index++;
  }
  if(row0-1 >= 0){
    data = {label : dataset[row0-1][column+column0], data : subset}; // TODO error check that row0-1 > 0
  }
  else {
    data = {label : dataset[row0][column+column0], data : subset}; // TODO this could be ""
  }
  return data;
}

function LoadRow (dataset, position, row) {
  var row0 = position.top;
  var column0 = position.left;
  var data = {};
  var subset = [];
  var index = 1;
  for(var column = column0; column < dataset[row+row0].length; column++){ // TODO check that column0-1 is > 0
    subset.push([index, dataset[row+row0][column]]); // TODO possible error case if column0-1 > column size
    index++; // NOTE: Each Index has a XAxis Label that corrisponds to the index number in setTicks()
  }
  if(column0 - 1 >= 0) {
    data = {label : dataset[row + row0][column0-1], data : subset}; // TODO error check that column0-1 > 0
  } 
  else {
    data = {label : dataset[row + row0][column0], data : subset}; // TODO: this could be ""
  }
  return data;
}

// Logical("xor"|"and"|"or", ax, bx) 
// About: comparison between two arrays
//     bits are right justified (least significant bit is to the right)
//     Special Cases: (null can be 0 or 1 and 3 = 3 just as 1 = 1 and 0 is false always)
// Examples:
//     Logical("and", 1, null) = result.value = 0
//     Logical("xor", 1, null) = result.value = 0 (because we dont know if there was really a change or not)
//     Logical("or", 1, null) = result.value = 1

function Logical (type, ax, bx) {
  var result = {value: null, // the result of the Logical operation
                diff : 0, // number of bits that are different between ax and bx
                change : 0, // estimate of the number of bits that need to be changed to get to eaither ax or bx from .value
                length : null, // size in terms of the number of bits
                up : 0, // number of bits rounded up
                down : 0, // number of bits rounded down
                type : type}; // type of operation
  if(ax.length != bx.length) {
    var resized = resize(ax, bx);
    ax = resized.ax;
    bx = resized.bx;
  }
  if (ax.length > 1 || bx.length > 1) {
    var msb = Logical(type, [ax[0]], [bx[0]]);
    var rem = Logical(type, ax.slice(1, ax.length), bx.slice(1, bx.length));
    // concatinate the msb with all the remaining bits
    result.value = [].concat(msb.value, rem.value);
    result.diff = msb.diff + rem.diff;
    result.change = msb.change + rem.change;
    result.length = msb.length + rem.length;
    result.up = msb.up + rem.up;
    result.down = msb.down + rem.down;
    return result;
  } 
  else {
    if(ax[0] != bx[0] && (ax[0] != null && bx[0] != null)) {
      result.diff = 1;
    }
    switch (type) {
    case "xor": // xor means that things are totally different
      if (ax[0] != bx[0]) { 
        result.value = (ax[0] == null || bx[0] == null) ? null : (ax[0] == 1 || bx[0] == 1) ? 1 : ax[0] > bx[0] ? ax[0] : bx[0]; // or maybe have the value be whatever value is larger or non zero
        result.length = 1;
        if(ax[0] != null && bx[0] != null){
          result.change = .5; 
          result.up = .5; 
        }
        return result;
      } 
      else { //(ax[0] == bx[0]) - with a corner case of null
        result.value = (ax[0] == null) ? null : 0; // TODO maybe both 0
        result.length = 1;
        if(ax[0] != 0 && ax[0] != null){
          result.down = 1; // TODO: maybe should be a % 3 and 3 for example
          result.change = 1; // both are 1 or both are the same value // maybe should be
        } 
      }
      return result;
    break;
    case "or": // or means that things are similar or the same (similar to a round up only)
      result.value = (ax[0] == null || bx[0] == null) ? null : (ax[0] == 0 && bx[0] == 0) ? 0 : ax[0] > bx[0] ? ax[0] : bx[0];
      if(result.value != null && result.value != 0){
        result.up = .5;      
        result.change = .5; // TODO: check for null case maybe also check for case for result.down where ax or bx > 1 or a non 1 number
      }
      result.length = 1;
      return result;
    break;
    case "and": // and means that things are identical (similar to a round down only)
      if (ax[0] == bx[0]) {
        result.value = ax[0];
        result.change = 0;
        result.length = 1;
        return result;
      } 
      else {
        result.value = (ax[0] == null || bx[0] == null) ? null : 0; // TODO: add these into the same function
        if(ax[0] != 0 && bx[0] != 0 && ax[0] != null && bx[0] != null){
          result.change = 1;  // maybe 2
          result.down = 1; // maybe do a %%
        } else { // one is 1 the other is 0
          if(ax[0] != null && bx[0] != null) {
            result.change = .5;
            result.up = .5; // TODO maybe add the ammount up...
          } 
        }
        result.length = 1;
        return result;
      }
      return result; 
    break;
    default: // nand
      if(ax[0] == bx[0] && ax[0] != 0) {
        result.value = (ax[0] == null) ? null : 0; 
        result.change = (ax[0] == null) ? 0 : 1;
        result.length = 1;
        result.down = (ax[0] == null) ? 0 : 1;
        return result;
      }
      else {
        result.value = (ax[0] == null || bx[0] == null) ? null : (ax[0] == 0 && bx[0] == 0) ? 1 : ax[0] == 0 ? bx[0] : bx[0] == 0 ? ax[0] : ax[0] < bx[0] ? ax[0] : bx[0]; // TODO: sepcial case we do less (maybe change)
        if(ax[0] == 0 && bx[0] == 0) {
          result.change = 1;
          result.up = 1;
        } else {
          if(ax[0] != null && bx[0] != null){
            result.change = .5;
            result.up = .5; // TODO: Check this case maybe do Math.abs()
          }
          return result;
        }
      }
      return result;
    }
  }
  return result;
}

var resize = function (ax, bx) {
  var result = {ax : ax, bx : bx};
  if(ax.length !== bx.length){
    if(ax.length > bx.length){
      return resize(ax, [].concat(null, bx));
    } else { //(ax.length < bx.length)
      return resize([].concat(null, ax), bx);
    }
  } 
  return result;
};

// convert to a binary dataset
function binary(dataset) {
  if(dataset.length > 1) {
    var bits =[];
    var msb = conv(dataset[0]);
    var remander = binary(dataset.slice(1,dataset.length));
    bits = bits.concat(msb, remander);
    return bits;
  } else {
    return [conv(dataset)];
  }
}

// converts the element to a binary number
var conv = function(element){
  var form = null;
  if(!isNaN(element) && element != null && element !== "") { // warning 0 = "" in javascript
    form = 1;
  } else {
    form = 0;
  }
  return form;
};

// returns the data row [] in the form of an array
function getRow(dataset, position, row) {
  var data = [];
  var row0 = position.top;
  var column0 = position.left
  if(row+row0 <= dataset.length) { // check for error case
    for(var column = column0; column < dataset[row+row0].length; column++) { // TODO ALSO CHECK CASE WHERE dataset[row+row0][column+column0] == null
      data.push(dataset[row+row0][column]);
    }
  }
  return data;
}

function getColumn(dataset, position, column) {
  var data = [];
  var row0 = position.top;
  var column0 = position.left;
  for(var row = row0; row < dataset.length; row++) {
    if(column + column0 > dataset[row].length) { // TODO ALSO CHECK CASE WHERE dataset[row][column+column0] == null
      data.push(0); // POSSIBLE BUG / ERROR CASE / TODO 
    }
    else {
      data.push(dataset[row][column+column0]);
    }
  }
  return data;
}
