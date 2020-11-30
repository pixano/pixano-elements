import { css } from 'lit-element';
import { genericStyles } from '@pixano/core/lib/style';

export const style2d = [genericStyles, css`
:host {
  width: 100%;
  height: 100%;
  min-width: 100px;
  position: relative;
  display: block;
}
.canvas-container {
  height: 100%;
  width: 100%;
  position: relative;
  background-repeat: no-repeat;
  margin: 0px;
  overflow: hidden;
}
.corner {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  right: 0px;
  margin-bottom: 10px;
  margin-left: 10px;
  margin-right: 10px;
  display: flex;
  position: absolute;
  margin-top: 10px;
  height: 24px;
  width: 24px;
  z-index: 1;
  color: black;
  background: white;
  fill: #79005D;
  padding: 10px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  -webkit-transition: all 0.5s ease;
    -moz-transition: all 0.5s ease;
      -o-transition: all 0.5s ease;
      -ms-transition: all 0.5s ease;
          transition: all 0.5s ease;
}
.corner:hover {
  background: #79005D;
  fill: white;
  color: white;
}
#snackbar {
  visibility: hidden;
  min-width: 250px;
  margin-left: -125px;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 2px;
  padding: 16px;
  position: fixed;
  z-index: 1;
  left: 50%;
  bottom: 30px;
  font-size: 17px;
  -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
       -khtml-user-select: none; /* Konqueror HTML */
         -moz-user-select: none; /* Old versions of Firefox */
          -ms-user-select: none; /* Internet Explorer/Edge */
              user-select: none; /* Non-prefixed version, currently
                                    supported by Chrome, Opera and Firefox */
}

#snackbar.show {
  visibility: visible;
  -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
  animation: fadein 0.5s, fadeout 0.5s 2.5s;
}

@-webkit-keyframes fadein {
  from {bottom: 0; opacity: 0;}
  to {bottom: 30px; opacity: 1;}
}

@keyframes fadein {
  from {bottom: 0; opacity: 0;}
  to {bottom: 30px; opacity: 1;}
}

@-webkit-keyframes fadeout {
  from {bottom: 30px; opacity: 1;}
  to {bottom: 0; opacity: 0;}
}

@keyframes fadeout {
  from {bottom: 30px; opacity: 1;}
  to {bottom: 0; opacity: 0;}
}
#zoom {
  right: 70px;
  font-size: 15px;
  font-weight: bold;
  text-align: center;
  background: #79005D;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hidden {
  opacity: 0;
}`];