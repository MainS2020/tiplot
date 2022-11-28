import "../css/layout.css";
import { useState, useEffect } from "react";
import Paper from "./Paper";
import Cesium from "./Cesium";
import TopBar from "./Navbar";

import SplitPane from "react-split-pane";

function Layout({ socket }) {
  //document.body.style.zoom = 0.75;

  const defaultSize = 0.65 * window.innerWidth; // percentage of screen width
  const [size, setSize] = useState(defaultSize);
  const [showView, setShowView] = useState(true);

  const toggle3dView = () => {
    setShowView(!showView);
    if (showView) setSize(window.innerWidth);
    else setSize(defaultSize);
  };

  // window resize listener
  useEffect(() => {
    var currentWidth = window.innerWidth;
    window.onresize = (event) => {
      var width = event.target.outerWidth;
      var currentRatio = size / currentWidth;
      var newWidth = currentRatio * width;
      setSize(newWidth);
      currentWidth = width;
    };
  });

  return (
    <>
      <TopBar page="home" toggle3dView={toggle3dView} showView={showView} />
      <SplitPane split="vertical" size={size} onDragFinished={setSize}>
        <Paper socket={socket} />
        <Cesium socket={socket} />
      </SplitPane>
    </>
  );
}

export default Layout;
