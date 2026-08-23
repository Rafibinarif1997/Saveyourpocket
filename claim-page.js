// =====================================================
// CONTRACT ADDRESSES
// =====================================================

function createContractAddresses() {

  if (
    document.getElementById(
      "last404ContractAddresses"
    )
  ) {
    return;
  }

  const box =
    document.createElement("div");

  box.id =
    "last404ContractAddresses";

  box.innerHTML = `
    <div class="l404-ca-title">
      CONTRACT ADDRESSES
    </div>

    <div class="l404-ca-item">

      <div class="l404-ca-label">
        TL404 TOKEN CA
      </div>

      <div class="l404-ca-row">

        <span class="l404-ca-address">
          0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d
        </span>

        <button
          type="button"
          class="l404-copy-btn"
          data-copy="0x316eC28D4e69Adf4697F0cA7DE45c164C295eC9d"
        >
          COPY
        </button>

      </div>

    </div>


    <div class="l404-ca-item">

      <div class="l404-ca-label">
        NFT CONTRACT CA
      </div>

      <div class="l404-ca-row">

        <span class="l404-ca-address">
          0x17B9371FED1A1865D97A288d10638c23012de78f
        </span>

        <button
          type="button"
          class="l404-copy-btn"
          data-copy="0x17B9371FED1A1865D97A288d10638c23012de78f"
        >
          COPY
        </button>

      </div>

    </div>
  `;


  box.style.cssText = `
    width:100%;
    box-sizing:border-box;
    margin:24px 0 10px;
    padding:20px;
    border:1px solid rgba(255,255,255,.14);
    border-radius:14px;
    background:rgba(0,0,0,.30);
  `;


  const style =
    document.createElement("style");

  style.textContent = `

    #last404ContractAddresses
    .l404-ca-title {
      text-align:center;
      font-size:11px;
      letter-spacing:3px;
      opacity:.6;
      margin-bottom:18px;
    }

    #last404ContractAddresses
    .l404-ca-item {
      margin-bottom:16px;
    }

    #last404ContractAddresses
    .l404-ca-item:last-child {
      margin-bottom:0;
    }

    #last404ContractAddresses
    .l404-ca-label {
      font-size:9px;
      letter-spacing:1.8px;
      opacity:.55;
      margin-bottom:7px;
    }

    #last404ContractAddresses
    .l404-ca-row {
      display:flex;
      align-items:center;
      gap:8px;
      width:100%;
    }

    #last404ContractAddresses
    .l404-ca-address {
      flex:1;
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font-family:monospace;
      font-size:10px;
      opacity:.85;
    }

    #last404ContractAddresses
    .l404-copy-btn {
      flex-shrink:0;
      border:1px solid rgba(255,255,255,.25);
      background:transparent;
      color:inherit;
      padding:7px 10px;
      border-radius:6px;
      font-size:9px;
      letter-spacing:1px;
      cursor:pointer;
    }

    #last404ContractAddresses
    .l404-copy-btn:active {
      transform:scale(.96);
    }

  `;

  document.head.appendChild(style);


  // Put it at the very bottom of the claim area
  if (
    button &&
    button.parentNode
  ) {

    button.parentNode.appendChild(box);

  } else {

    document.body.appendChild(box);
  }


  // Copy buttons
  box
    .querySelectorAll(".l404-copy-btn")
    .forEach(function (copyButton) {

      copyButton.addEventListener(
        "click",
        async function () {

          const address =
            copyButton.dataset.copy;

          try {

            await navigator.clipboard.writeText(
              address
            );

            const oldText =
              copyButton.textContent;

            copyButton.textContent =
              "COPIED!";

            setTimeout(
              function () {
                copyButton.textContent =
                  oldText;
              },
              1500
            );

          } catch (err) {

            // Mobile/DApp fallback
            const input =
              document.createElement("textarea");

            input.value =
              address;

            input.style.position =
              "fixed";

            input.style.opacity =
              "0";

            document.body.appendChild(input);

            input.select();

            document.execCommand("copy");

            input.remove();

            copyButton.textContent =
              "COPIED!";

            setTimeout(
              function () {
                copyButton.textContent =
                  "COPY";
              },
              1500
            );
          }
        }
      );
    });
}


// Initialize
createContractAddresses();
