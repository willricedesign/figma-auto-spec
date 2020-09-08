// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

// Load fonts
figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
figma.loadFontAsync({ family: 'Roboto', style: 'Bold' });

//Helpers
const solidColor = (r = 255, g = 0, b = 0) => ({
  type: 'SOLID',
  color: {
    r: r / 255,
    g: g / 255,
    b: b / 255
  }
});



// On UI message:
figma.ui.onmessage = msg => {

  // Spacing token converter algoritihim
  let exactDistance;
  let spacingTokenText;
  let spacingTokenValue;

  const spacingTokenAlgo = () => {
    if (exactDistance >= 3 && exactDistance <= 5) {
      spacingTokenText = '@space-xxs (4)';
      spacingTokenValue = 4;
    } else if (exactDistance >= 6 && exactDistance <= 11) {
      spacingTokenText = '@space-xs (8)';
      spacingTokenValue = 8;
    } else if (exactDistance >= 12 && exactDistance <= 19) {
      spacingTokenText = '@space-sm (16)';
      spacingTokenValue = 16;
    } else if (exactDistance >= 20 && exactDistance <= 28) {
      spacingTokenText = '@space-md (24)';
      spacingTokenValue = 24;
    } else if (exactDistance >= 29 && exactDistance <= 39) {
      spacingTokenText = '@space-lg (32)';
      spacingTokenValue = 32;
    } else if (exactDistance >= 40 && exactDistance <= 55) {
      spacingTokenText = '@space-xl (48)';
      spacingTokenValue = 48;
    } else if (exactDistance >= 56 && exactDistance <= 78) {
      spacingTokenText = '@space-xxl (64)';
      spacingTokenValue = 64;
    } else if (exactDistance >= 79 && exactDistance <= 110) {
      spacingTokenText = '@space-xxxl (96)';
      spacingTokenValue = 96;
    } else {
      return; // cancel script
    }
  }

  // Guideline specification values
  // Thickness (height/width) of the guide and how offset they are
  const specFramePadding = 32;
  const guideOffsetVert = 16;
  const guideOffsetHorz = 96;
  const guideHeightVert = 120;
  const guideWidthHorz = 240;
  
  if (msg.type === 'spec-space') {

    const nodeSelection = figma.currentPage.selection;
    console.log(nodeSelection);
    if (nodeSelection.length == 0) {
      figma.notify('Select object\(s\)');
      return; // cancel script
    }

    // for each object in the array, get their node, x, y, w and h
    // sort them by x value in the array
    // then foreach run the measurement function against n vs n+1
    // until n+1.length == 0

    // Get the X value for the first node (note nodes are initally randomly arranged in the array)
    const firstNode = nodeSelection[0];
    const firstX = nodeSelection[0].x;
    const firstY = nodeSelection[0].y;
    const firstW = nodeSelection[0].width;
    const firstH = nodeSelection[0].height;

    let secondNode;
    let secondX;
    let secondY;
    let secondW;
    let secondH;

    if (msg.spaceType === 'vert' || msg.spaceType === 'horz') {
      console.log(msg.spaceType)
      secondNode = nodeSelection[1];
      secondX = nodeSelection[1].x;
      secondY = nodeSelection[1].y;
      secondW = nodeSelection[1].width;
      secondH = nodeSelection[0].height;
    }

    let specPositionX;
    let specPositionY;
    let targetNode;

    // If we're measuring vertical distance between two objects
    if (msg.spaceType === 'vert') {
      const distanceX = Math.abs(firstX - secondX);
      specPositionY = firstY;
      // figma.currentPage.selection randomly places objects in an array
      // we need to find out which object's width should be deducted from the distance
      // (Figma sets X and Y to the top left corner of an object)
      if (firstX < secondX) {
        exactDistance = distanceX-firstW;
        specPositionX = firstX+firstW;
        targetNode = firstNode;
      } else if (firstX > secondX) {
        exactDistance = distanceX-secondW;
        specPositionX = secondX+secondW;
        targetNode = secondNode;
      }
    // If we're measuring horizontal distance between two objects
    } else if (msg.spaceType === 'horz') {
      const distanceY = Math.abs(firstY - secondY);
      specPositionX = firstX;
      if (firstY < secondY) {
        targetNode = firstNode;
        exactDistance = distanceY-firstH;
        specPositionY = firstY+firstH;
      } else if (firstY > secondY) {
        targetNode = secondNode;
        exactDistance = distanceY-secondH;
        specPositionY = secondY+secondH;
      }
    // If it's measuring from object to parent
    } else if (msg.spaceType === 'frame-top') {
      targetNode = firstNode;
      specPositionX = firstX;
      specPositionY = 0;
      exactDistance = firstY; 
    } else if (msg.spaceType === 'frame-bottom') {
      targetNode = firstNode;
      const parentH = targetNode.parent.height;
      exactDistance = parentH - (firstY+firstH);
      specPositionX = firstX;
      specPositionY = parentH-exactDistance;;
    } else if (msg.spaceType === 'frame-left') {
      targetNode = firstNode;
      specPositionX = 0;
      specPositionY = firstY+specFramePadding; //offset default spacer padding
      exactDistance = firstX; 
    } else if (msg.spaceType === 'frame-right') {
      targetNode = firstNode;
      const parentW = targetNode.parent.width;
      exactDistance = parentW - (firstX+firstW);
      specPositionX = parentW-exactDistance;
      specPositionY = firstY+specFramePadding; //offset default spacer padding 
    }

    //Convert exact distance to spacing token text and value
    spacingTokenAlgo();
    // Cancel script if algo can't guess
    if (spacingTokenText == undefined) {
      figma.notify('😬Object(s) are too close or too far apart to measure that');
      return;
    }

    // Create the outer specification frame
    const specFrame = figma.createFrame();
    specFrame.name = spacingTokenText;
    specFrame.expanded = false;
    if (msg.spaceType === 'vert' || msg.spaceType === 'frame-left' || msg.spaceType === 'frame-right') {
      specFrame.x = specPositionX;
      specFrame.y = specPositionY - specFramePadding;
      specFrame.resize(spacingTokenValue, guideHeightVert);
    } else if (msg.spaceType === 'horz' || msg.spaceType === 'frame-top' || msg.spaceType === 'frame-bottom') { 
      specFrame.x = specPositionX + specFramePadding;
      specFrame.y = specPositionY;
      specFrame.resize(guideWidthHorz, spacingTokenValue);
    }

    specFrame.clipsContent = false;
    specFrame.fills = [{type: 'SOLID', color: {r: 0, g: 0, b: 0}, visible: false}];
    targetNode.parent.appendChild(specFrame);

    // Semi transparent guide background
    const guideBackground = figma.createRectangle();
    if (msg.spaceType === 'vert' || msg.spaceType === 'frame-left' || msg.spaceType === 'frame-right') {
      guideBackground.y = guideOffsetVert;
      guideBackground.resize(spacingTokenValue, guideHeightVert-guideOffsetVert);
    } else if (msg.spaceType === 'horz' || msg.spaceType === 'frame-top' || msg.spaceType === 'frame-bottom') { 
      guideBackground.x = 0;
      guideBackground.resize(guideWidthHorz-guideOffsetHorz, spacingTokenValue);
    }
    guideBackground.fills = [].concat(solidColor(235, 138, 47));
    guideBackground.opacity = 0.3;
    guideBackground.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
    specFrame.appendChild(guideBackground);
    

    // Two guidelines, one left, one right
    const createGuideline = ( glPos ) => {
      const gl = figma.createLine();
      if (msg.spaceType === 'vert' || msg.spaceType === 'frame-left' || msg.spaceType === 'frame-right') {
        gl.y = guideOffsetVert;
        gl.x = glPos;
        gl.rotation = -90;
        gl.resize(guideHeightVert-guideOffsetVert, 1);
      } else if (msg.spaceType === 'horz' || msg.spaceType === 'frame-top' || msg.spaceType === 'frame-bottom') { 
        gl.x = 0;
        gl.y = glPos+1;
        gl.rotation = 0;
        gl.resize(guideWidthHorz-guideOffsetHorz, 1);
      }
    
      gl.strokes = [].concat(solidColor(190, 90, 14));
      gl.dashPattern = [4, 4];
      gl.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
      
      return gl;
    };

    const guideLineOne = createGuideline(0);
    specFrame.appendChild(guideLineOne);

    const guideLineTwo = createGuideline(spacingTokenValue-1);
    specFrame.appendChild(guideLineTwo);

    // Create the label
    const labelText = figma.createText();
    labelText.characters = spacingTokenText;
    labelText.fontSize = 12;
    labelText.fontName = { family: 'Roboto', style: 'Bold'};
    labelText.fills = [].concat(solidColor(190, 90, 14));
    if (msg.spaceType === 'vert' || msg.spaceType === 'frame-left' || msg.spaceType === 'frame-right') {
      labelText.x = -(labelText.width/2-specFrame.width/2);
      labelText.textAlignHorizontal = 'CENTER';
      labelText.constraints = {horizontal: 'CENTER', vertical: 'MIN'}
    } else if (msg.spaceType === 'horz' || msg.spaceType === 'frame-top' || msg.spaceType === 'frame-bottom') { 
      labelText.x = guideWidthHorz-guideOffsetHorz+8;
      labelText.y = (spacingTokenValue/2)-(labelText.height/2);
      labelText.constraints = {horizontal: 'MAX', vertical: 'CENTER'}
    }

    specFrame.appendChild(labelText);

    //label.textAlignHorizontal = 'CENTER'
    //label.textAlignVertical = 'BOTTOM'
    //label.constraints = {horizontal: 'STRETCH', vertical: 'STRETCH'}
  }

  // Close the plugin
  //if (msg.type === 'cancel') {
  //  figma.closePlugin();
  //};
};
