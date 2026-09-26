export default function Loader() {
    return (
      <div className="loader-wrap">
        <div className="loader">
          <div className="item" />
          <div className="item" />
          <div className="item" />
        </div>
  
        <style>{`
          .loader-wrap {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #151330;
          }
  
          .loader {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            perspective: 800px;
            position: relative;
          }
  
          .loader .item {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
          }
  
          .loader .item:nth-child(1) {
            border-bottom: 6px solid red;
            transform: rotateX(35deg) rotateY(-45deg);
            animation: rotate-one 1s linear infinite;
          }
  
          .loader .item:nth-child(2) {
            border-bottom: 6px solid blue;
            transform: rotateX(50deg) rotateY(-10deg);
            animation: rotate-two 1s linear infinite;
          }
  
          .loader .item:nth-child(3) {
            border-bottom: 6px solid rgb(0, 255, 34);
            transform: rotateX(35deg) rotateY(55deg);
            animation: rotate-three 1s linear infinite;
          }
  
          @keyframes rotate-one {
            to {
              transform: rotateX(35deg) rotateY(-45deg) rotateZ(360deg);
            }
          }
  
          @keyframes rotate-two {
            to {
              transform: rotateX(50deg) rotateY(-10deg) rotateZ(360deg);
            }
          }
  
          @keyframes rotate-three {
            to {
              transform: rotateX(35deg) rotateY(55deg) rotateZ(360deg);
            }
          }
        `}</style>
      </div>
    );
  }