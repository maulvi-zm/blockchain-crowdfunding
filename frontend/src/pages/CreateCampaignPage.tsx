import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { uploadFile, uploadJSON } from "../utils/ipfs";
import { ethers } from "ethers";
import { CHAIN_ID, CONTRACT_ADDRESS, CROWDFUNDING_ABI } from "../contract/crowdfunding";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TEST_DEADLINE_SECONDS = Number(import.meta.env.VITE_TEST_DEADLINE_SECONDS || "60");

export function CreateCampaignPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalIdr, setGoalIdr] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function fetchRate() {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/oracle/rate?pair=ETH_IDR`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.available && data.rate) {
          setRate(Number(data.rate));
          return;
        }
      }
    } catch (e) {
      console.warn("Backend rate fetch failed, falling back");
    }

    try {
      const cg = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr"
      );
      const d = await cg.json();
      if (d?.ethereum?.idr) setRate(Number(d.ethereum.idr));
    } catch (e) {
      console.warn("CoinGecko fallback failed", e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }

    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
      alert("Invalid contract address");
      return;
    }

    if (!title || !description || !goalIdr || !imageFile || !deadlineDate) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (Number(network.chainId) !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x7A69" }], // 31337
          });
        } catch (err) {
          alert("Please add & select Hardhat network in MetaMask");
          return;
        }
      }

      const imageCid = await uploadFile(imageFile);
      const metadataCid = await uploadJSON({
        name: title,
        description,
        image: `ipfs://${imageCid}`,
        goal_idr: goalIdr ? Number(goalIdr) : null,
      });

      const goalIdrValue = BigInt(goalIdr);

      const todayStr = new Date().toISOString().slice(0, 10);
      let deadlineTs: number;
      const timePart = deadlineTime ? `${deadlineTime}:00` : "23:59:59";
      const selectedDeadline = new Date(`${deadlineDate}T${timePart}`);
      const latestBlock = await provider.getBlock("latest");
      const chainNow = latestBlock?.timestamp || Math.floor(Date.now() / 1000);
      const minBufferSeconds = TEST_DEADLINE_SECONDS;
      if (deadlineDate < todayStr || Number.isNaN(selectedDeadline.getTime()) || selectedDeadline.getTime() <= chainNow * 1000) {
        deadlineTs = chainNow + minBufferSeconds;
      } else {
        deadlineTs = Math.floor(selectedDeadline.getTime() / 1000);
      }
      if (!deadlineTs || deadlineTs <= chainNow + minBufferSeconds) {
        deadlineTs = chainNow + minBufferSeconds;
      }
      console.log("deadline debug", {
        selectedDate: deadlineDate,
        selectedTime: deadlineTime || null,
        selectedDeadlineMs: selectedDeadline.getTime(),
        chainNow,
        deadlineTs,
        chainNowIso: new Date(chainNow * 1000).toISOString(),
        deadlineIso: new Date(deadlineTs * 1000).toISOString(),
      });

      const signer = await provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CROWDFUNDING_ABI, signer);

      const tx = await contract.createCampaign(
        goalIdrValue,
        deadlineTs,
        metadataCid
      );

      await tx.wait();

      alert("Campaign created");

      // reset minimal
      setTitle("");
      setDescription("");
      setGoalIdr("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    fetchRate();
    console.log("address: ", CONTRACT_ADDRESS);
  }, []);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          Start a Fundraiser
        </h1>
        <p className="text-slate-500 text-lg">
          Tell your story and connect with donors who care.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 lg:p-12"
      >
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm">
                1
              </span>
              Cause Details
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Campaign Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  type="text"
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Help rebuild the community center"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Why are you raising funds?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Tell your story clearly and honestly..."
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm">
                2
              </span>
              Goal & Timeline
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT COLUMN */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Fundraising Goal
                </label>

                <div className="relative">
                  <input
                    value={goalIdr}
                    onChange={(e) => setGoalIdr(e.target.value)}
                    type="number"
                    step="1"
                    className="w-full pl-4 pr-12 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    IDR
                  </span>
                </div>

                {rate ? (
                  <div className="text-sm text-slate-500 mt-2">
                    Estimated:{" "}
                    {(Number(goalIdr || 0) / rate).toFixed(6)} ETH @{" "}
                    {rate.toLocaleString()} IDR/ETH
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 mt-2">
                    Fetching rate...
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Campaign Deadline
                </label>

                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  />
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm">
                3
              </span>
              Photo
            </h3>
            <label className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImageFile(f);
                    setImagePreview(URL.createObjectURL(f));
                  }
                }}
              />
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4 text-teal-600">
                <span className="text-2xl">+</span>
              </div>
              <span className="font-semibold text-slate-700">
                Upload a cover photo
              </span>
              <span className="text-sm text-slate-400 mt-2">
                A high-quality image helps build trust.
              </span>
              {imagePreview && (
                <div className="mt-6 relative inline-block">
                  {/* IMAGE */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 rounded-lg object-cover shadow"
                  />

                  {/* REMOVE BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);

                      // reset input file (biar bisa upload ulang file yang sama)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black transition"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>

                  {/* FILE NAME */}
                  <div className="text-sm text-slate-500 mt-2 text-center">
                    {imageFile?.name}
                  </div>
                </div>
              )}
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              primary
              disabled={loading}
              className="w-full md:w-auto px-12 py-4 text-lg"
            >
              {loading ? "Launching..." : "Launch Campaign"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
