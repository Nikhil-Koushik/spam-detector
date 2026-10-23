import { useEffect, useState, useRef, type CSSProperties } from "react";
// import './App.css'

function HomePage() {
  const hasRendered = useRef(false);

  useEffect(() => {
    if (hasRendered.current) return;
    initializeSpamDetector();
    hasRendered.current = true;
  }, []);

  const [inputValue, setInputValue] = useState<string>("");
  const [displayingData, setDisplayingData] = useState<Boolean>(false);
  const [spamArr, setSpamArr] = useState<string[]>([]);
  const [spamArrResponse, setSpamArrResponse] = useState<string[]>([]);

  const initializeSpamDetector: Function = async (): Promise<void> => {
    try {
      console.log("Fetching Data");
      const response = await fetch("/spam-detector-health", {
        method: "GET",
      });

      const data = await response.json();
      console.log(data?.data?.message);
    } catch (e) {
      console.error("Failed to initialize spam detector", e);
    } finally {
      console.log("Spam detector initialized successfully");
    }
  };

  const checkSpam: Function = async (): Promise<void> => {
    try {
      setSpamArrResponse([]);
      console.log("Fetching Data");
      console.log(spamArr);
      const body = {
        emails: spamArr,
      };
      const response = await fetch("/check-spam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setSpamArrResponse(data.data.prediction);
      setDisplayingData(true);
      //   updateSpamData();
    } catch (e) {
      console.error("Failed to fetch spam detection api", e);
    } finally {
      console.log("Detected data successfully");
    }
  };

  const addToSpamCheck: Function = (): void => {
    if (inputValue.trim()) {
      if (displayingData) {
        setDisplayingData(false);
        setSpamArrResponse([]);
        setSpamArr([]);
      }
      setSpamArr((prev) => [inputValue, ...prev]);
      setInputValue("");
    }
  };

  const bubbleStyling: CSSProperties = {
    padding: "4px 12px",
    borderRadius: "8px",
    backgroundColor: "gray",
    width: "max-content",
    textWrap: "wrap",
    maxWidth: "100%",
    boxSizing: "border-box",
    textAlign: "left",
  };

  const spamArrContainer: CSSProperties = {
    padding: "8px 8px",
    borderRadius: "8px",
    backgroundColor: "",
    border: "1px solid #FEFEFE",
    minWidth: "200px",
    width: "max-content",
    maxWidth: "600px",
    flexWrap: "wrap",
    display: "flex",
    gap: "4px",
  };

  const parentDivStyling: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "600px",
    alignItems: "center",
  };

  const inputStyling: CSSProperties = {
    height: "100%",
    boxSizing: "border-box",
  };

  const addButtonStyling: CSSProperties = {
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
  };
  const inputContainerStyling: CSSProperties = {
    display: "flex",
    height: "32px",
    gap: "4px",
  };

  const checkButtonStyling: CSSProperties = {
    width: "max-content",
  };

  const successStyling: CSSProperties = {
    backgroundColor: "#008000b3",
  };
  const dangerStyling: CSSProperties = {
    backgroundColor: "#ff00006e",
  };

  const reset = () => {
    setInputValue("");
    setSpamArr([]);
    setDisplayingData(false);
    setSpamArrResponse([]);
  };

  return (
    <>
      <div style={parentDivStyling}>
        <h1>Spam Email Detector</h1>
        <div style={inputContainerStyling}>
          <input
            style={inputStyling}
            type="text"
            value={inputValue}
            onChange={(e) => {
              if(displayingData) {
                setDisplayingData(false);
                setSpamArr([]);
                setSpamArrResponse([]);
              }
              setInputValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addToSpamCheck();
              }
            }}
          />
          <button
            style={addButtonStyling}
            onClick={() => {
              addToSpamCheck();
            }}
          >
            Add
          </button>
        </div>
        {spamArr.length > 0 && (
          <div style={spamArrContainer}>
            {spamArr.map((item, index) => (
              <div
                key={index}
                style={{
                  ...bubbleStyling,
                  ...(displayingData &&
                    (spamArrResponse[index] === "ham"
                      ? successStyling
                      : dangerStyling)),
                }}
              >
                {item}
                {displayingData
                  ? spamArrResponse[index] === "ham"
                    ? ": Not Spam"
                    : ": Spam"
                  : ""}
              </div>
            ))}
          </div>
        )}
        {!displayingData && spamArr.length > 0 && (
          <button
            style={checkButtonStyling}
            onClick={() => {
              checkSpam();
            }}
          >
            Check
          </button>
        )}
        {displayingData && (
          <button
            style={checkButtonStyling}
            onClick={() => {
              reset();
            }}
          >
            Clear
          </button>
        )}
      </div>
    </>
  );
}

export default HomePage;
