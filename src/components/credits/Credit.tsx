import { MDXRemote } from "next-mdx-remote"
import React, { useCallback, useState } from "react"

export function Credit({
  name,
  author,
  url,
  license,
  info,
  licenseUrl,
}: {
  name: string
  author: string
  url: string
  license?: any
  info?: any
  licenseUrl?: string
}) {
  const [isLicenseShown, setIsLicenseShown] = useState(false)
  const [isInfoShown, setIsInfoShown] = useState(false)

  const onClickShowLicense = useCallback(
    function onClickShowLicense(event) {
      event.preventDefault()
      setIsLicenseShown(!isLicenseShown)
    },
    [isLicenseShown]
  )

  const onClickToggleShowInfo = useCallback(
    function onClickToggleShowInfo(event) {
      event.preventDefault()
      setIsInfoShown(!isInfoShown)
    },
    [isInfoShown]
  )

  return (
    <div className="credit rounded bg-secondary-subtle">
      <div className="credit__header">
        <div className="credit__head-line">
          <span className="credit__name">{name}</span>
          {author && (
            <>
              <span className="credit__by"> by </span>
              <span className="credit__author">{author}</span>
            </>
          )}
        </div>
        <div className="credit__links">
          <a
            className="credit__toggle-show-license"
            href={licenseUrl || "#"}
            target={licenseUrl && "_blank"}
            rel={licenseUrl && "noopener noreferrer"}
            onClick={!licenseUrl ? onClickShowLicense : undefined}
          >
            {isLicenseShown ? "Hide license" : "Show license"}
          </a>
          {info && (
            <a
              className="credit__toggle-show-info"
              href="#"
              onClick={onClickToggleShowInfo}
            >
              {isInfoShown ? "Hide info" : "Show info"}
            </a>
          )}
          <a
            className="credit__url"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {"Website"}
          </a>
        </div>
      </div>
      {license && (
        <div
          className="credit__license"
          style={{ display: isLicenseShown ? "block" : "none" }}
        >
          <MDXRemote {...license} />
        </div>
      )}
      {info && (
        <div
          className="credit__info"
          style={{ display: isInfoShown ? "block" : "none" }}
        >
          <MDXRemote {...info} />
        </div>
      )}
    </div>
  )
}
